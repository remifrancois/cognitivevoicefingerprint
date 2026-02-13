#!/usr/bin/env python3
"""
extract_features_v5.py -- V5 GPU-accelerated acoustic feature extraction.

Extends V4 with:
  - GPU acceleration (MPS/CUDA/CPU fallback) via torchaudio
  - Whisper large-v3 word-level timestamps
  - 6 new acoustic features (formant bandwidth, spectral tilt, voice breaks,
    tremor freq, breathiness H1-H2, loudness decay)
  - 5 temporal indicators from measured word timestamps

Usage:
    python extract_features_v5.py \
        --audio-path rec.wav --task-type conversation --gender female \
        --gpu --whisper-model large-v3 --word-timestamps

References:
    Little et al. (2009) - PPE algorithm, IEEE TBME.
    Tsanas et al. (2011) - Nonlinear speech signal features for PD classification.
    Radford et al. (2023) - Whisper: Robust Speech Recognition via Large-Scale
                            Weak Supervision.
"""

import argparse, json, sys, math, os, warnings
import numpy as np

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

# ============================================================================
# Function word list for pause_before_noun heuristic
# ============================================================================

_FUNCTION_WORDS = frozenset({
    "a", "an", "the", "this", "that", "these", "those",
    "i", "me", "my", "mine", "we", "us", "our", "ours",
    "you", "your", "yours", "he", "him", "his", "she", "her", "hers",
    "it", "its", "they", "them", "their", "theirs",
    "is", "am", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did",
    "will", "would", "shall", "should", "may", "might", "can", "could", "must",
    "and", "but", "or", "nor", "for", "yet", "so",
    "in", "on", "at", "to", "for", "with", "by", "from", "of", "about",
    "into", "through", "during", "before", "after", "above", "below",
    "between", "under", "over", "up", "down", "out", "off",
    "if", "then", "else", "when", "while", "as", "than", "because",
    "not", "no", "very", "just", "also", "too", "more", "most",
    "what", "which", "who", "whom", "whose", "where", "how",
    "all", "each", "every", "both", "few", "some", "any", "many", "much",
    "there", "here", "now", "then", "still", "already",
})

# ============================================================================
# Device detection
# ============================================================================

def get_device(prefer_gpu=True):
    """Detect best available device: MPS (Apple Silicon) -> CUDA -> CPU."""
    if not prefer_gpu:
        return "cpu"
    try:
        import torch
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    return "cpu"


# ============================================================================
# Audio loading with GPU-accelerated MFCC (torchaudio) or librosa fallback
# ============================================================================

def load_audio_and_mfcc(audio_path, sr=16000, n_mfcc=13, device="cpu"):
    """
    Load audio and compute MFCCs.

    Attempts torchaudio on the requested device first; falls back to librosa
    on CPU if torchaudio is unavailable or the GPU transfer fails.

    Returns
    -------
    y : np.ndarray   -- mono float32 waveform at ``sr``
    sr : int          -- sample rate
    mfccs : np.ndarray -- (n_mfcc, T) MFCC matrix
    backend : str     -- "torchaudio" or "librosa"
    """
    # --- try torchaudio (GPU-capable) ---
    try:
        import torch
        import torchaudio

        waveform, orig_sr = torchaudio.load(audio_path)

        # Mono
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        # Resample
        if orig_sr != sr:
            resampler = torchaudio.transforms.Resample(orig_freq=orig_sr, new_freq=sr)
            waveform = resampler(waveform)

        # GPU-accelerated MFCC
        mfcc_transform = torchaudio.transforms.MFCC(
            sample_rate=sr, n_mfcc=n_mfcc,
            melkwargs={"n_fft": 512, "hop_length": 160, "n_mels": 40},
        )
        try:
            waveform_dev = waveform.to(device)
            mfcc_transform = mfcc_transform.to(device)
            mfcc_tensor = mfcc_transform(waveform_dev)  # (1, n_mfcc, T)
            mfccs = mfcc_tensor.squeeze(0).cpu().numpy()
        except Exception:
            # GPU failed, run on CPU tensor
            mfcc_tensor = torchaudio.transforms.MFCC(
                sample_rate=sr, n_mfcc=n_mfcc,
                melkwargs={"n_fft": 512, "hop_length": 160, "n_mels": 40},
            )(waveform)
            mfccs = mfcc_tensor.squeeze(0).numpy()

        y = waveform.squeeze(0).numpy().astype(np.float32)
        return y, sr, mfccs, "torchaudio"

    except ImportError:
        pass
    except Exception:
        pass

    # --- fallback: librosa (CPU only) ---
    import librosa

    y, sr = librosa.load(audio_path, sr=sr, mono=True)
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    return y, sr, mfccs, "librosa"


# ============================================================================
# Sanitize
# ============================================================================

def sanitize_features(features):
    """Replace NaN/Infinity with None, validate all values are numeric."""
    sanitized = {}
    for key, value in features.items():
        if value is None:
            sanitized[key] = None
        elif isinstance(value, (int, float)):
            if math.isfinite(value):
                sanitized[key] = round(value, 6)
            else:
                sanitized[key] = None
        elif isinstance(value, (np.integer,)):
            sanitized[key] = int(value)
        elif isinstance(value, (np.floating,)):
            sanitized[key] = round(float(value), 6) if np.isfinite(value) else None
        else:
            sanitized[key] = None
    return sanitized


# ============================================================================
# nolds helper -- prefer nolds-rs, fall back to Python nolds
# ============================================================================

def _get_nolds():
    """Return the nolds module (Rust extension or pure-Python fallback)."""
    try:
        import nolds_rs as nolds  # type: ignore
        return nolds
    except ImportError:
        pass
    import nolds  # type: ignore
    return nolds


# ============================================================================
# Tier 1: Core acoustic features (F0, jitter, shimmer, HNR, MFCC)
# ============================================================================

def extract_tier1(sound, y, sr, mfccs=None):
    """Core features using parselmouth Sound + librosa/torchaudio arrays.

    Parameters
    ----------
    sound : parselmouth.Sound
    y : np.ndarray
    sr : int
    mfccs : np.ndarray or None
        Pre-computed (n_mfcc, T) matrix.  If None, computed via librosa.
    """
    from parselmouth.praat import call
    features = {}

    # F0 via Praat pitch tracking (75-500 Hz)
    try:
        pitch = call(sound, "To Pitch", 0.0, 75, 500)
        f0 = pitch.selected_array["frequency"]
        f0v = f0[f0 > 0]
        if len(f0v) > 0:
            features["f0_mean"] = float(np.mean(f0v))
            features["f0_sd"] = float(np.std(f0v))
            features["f0_range"] = float(np.max(f0v) - np.min(f0v))
        else:
            features["f0_mean"] = features["f0_sd"] = features["f0_range"] = None
    except Exception:
        features["f0_mean"] = features["f0_sd"] = features["f0_range"] = None

    # Jitter local
    try:
        pp = call(sound, "To PointProcess (periodic, cc)", 75, 500)
        features["jitter_local"] = float(
            call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
        )
    except Exception:
        features["jitter_local"] = None

    # Shimmer local
    try:
        pp = call(sound, "To PointProcess (periodic, cc)", 75, 500)
        features["shimmer_local"] = float(
            call([sound, pp], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        )
    except Exception:
        features["shimmer_local"] = None

    # HNR
    try:
        harm = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
        features["hnr"] = float(call(harm, "Get mean", 0, 0))
    except Exception:
        features["hnr"] = None

    # MFCC coefficient 2 mean
    try:
        if mfccs is not None:
            features["mfcc2_mean"] = float(np.mean(mfccs[1]))
        else:
            import librosa
            computed = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            features["mfcc2_mean"] = float(np.mean(computed[1]))
    except Exception:
        features["mfcc2_mean"] = None

    return features


# ============================================================================
# Tier 2: Advanced features (nonlinear dynamics, cepstral, formants)
# ============================================================================

def extract_tier2(sound, y, sr):
    """Advanced features: RPDE, DFA, PPE, CPP, articulation rate, formants,
    spectral harmonicity."""
    from parselmouth.praat import call
    nolds = _get_nolds()
    features = {}

    # RPDE (Recurrence Period Density Entropy) via sample entropy proxy
    try:
        step = max(1, len(y) // 5000)
        rpde = nolds.sampen(y[::step].astype(np.float64), emb_dim=2)
        features["rpde"] = float(rpde) if np.isfinite(rpde) else None
    except Exception:
        features["rpde"] = None

    # DFA (Detrended Fluctuation Analysis)
    try:
        step = max(1, len(y) // 5000)
        dfa_val = nolds.dfa(y[::step].astype(np.float64))
        features["dfa"] = float(dfa_val) if np.isfinite(dfa_val) else None
    except Exception:
        features["dfa"] = None

    # PPE (Pitch Period Entropy) -- Little 2009 algorithm
    try:
        pitch = call(sound, "To Pitch", 0.0, 75, 500)
        f0v = pitch.selected_array["frequency"]
        f0v = f0v[f0v > 0]
        if len(f0v) > 2:
            st_diffs = 12.0 * np.log2(f0v[1:] / f0v[:-1])
            hist, _ = np.histogram(st_diffs, bins=30, density=True)
            hist = hist[hist > 0]
            hist = hist / hist.sum()
            features["ppe"] = float(-np.sum(hist * np.log2(hist)))
        else:
            features["ppe"] = None
    except Exception:
        features["ppe"] = None

    # CPP (Cepstral Peak Prominence)
    try:
        features["cpp"] = _compute_cpp(y, sr)
    except Exception:
        features["cpp"] = None

    # Articulation rate (voiced frames / total as proxy)
    try:
        pitch = call(sound, "To Pitch", 0.0, 75, 500)
        f0 = pitch.selected_array["frequency"]
        features["articulation_rate"] = (
            float(np.sum(f0 > 0) / len(f0)) if len(f0) > 0 else None
        )
    except Exception:
        features["articulation_rate"] = None

    # Formants F1, F2 mean via Praat
    try:
        formant = call(sound, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)
        n = call(formant, "Get number of frames")
        f1s, f2s = [], []
        for i in range(1, n + 1):
            t = call(formant, "Get time from frame number", i)
            f1 = call(formant, "Get value at time", 1, t, "Hertz", "Linear")
            f2 = call(formant, "Get value at time", 2, t, "Hertz", "Linear")
            if not math.isnan(f1) and f1 > 0:
                f1s.append(f1)
            if not math.isnan(f2) and f2 > 0:
                f2s.append(f2)
        features["f1_mean"] = float(np.mean(f1s)) if f1s else None
        features["f2_mean"] = float(np.mean(f2s)) if f2s else None
    except Exception:
        features["f1_mean"] = features["f2_mean"] = None

    # Spectral harmonicity (harmonic-to-total energy ratio)
    try:
        features["spectral_harmonicity"] = _compute_spectral_harmonicity(y, sr)
    except Exception:
        features["spectral_harmonicity"] = None

    return features


# ============================================================================
# Sustained vowel (/aaa/ micro-task)
# ============================================================================

def extract_sustained_vowel(sound, y, sr):
    """Full jitter, shimmer, HNR, NHR, CPP, F0 stats, RPDE, DFA, PPE, D2."""
    from parselmouth.praat import call
    nolds = _get_nolds()
    features = {}

    # Point process (shared for jitter + shimmer)
    try:
        pp = call(sound, "To PointProcess (periodic, cc)", 75, 500)
    except Exception:
        pp = None

    # Full jitter suite
    jitter_defs = {
        "jitter_local": "Get jitter (local)",
        "jitter_local_abs": "Get jitter (local, absolute)",
        "jitter_rap": "Get jitter (rap)",
        "jitter_ppq5": "Get jitter (ppq5)",
        "jitter_ddp": "Get jitter (ddp)",
    }
    for key, cmd in jitter_defs.items():
        try:
            val = call(pp, cmd, 0, 0, 0.0001, 0.02, 1.3) if pp else None
            features[key] = (
                float(val) if val is not None and np.isfinite(val) else None
            )
        except Exception:
            features[key] = None

    # Full shimmer suite
    shimmer_defs = {
        "shimmer_local": "Get shimmer (local)",
        "shimmer_local_db": "Get shimmer (local, dB)",
        "shimmer_apq3": "Get shimmer (apq3)",
        "shimmer_apq5": "Get shimmer (apq5)",
        "shimmer_apq11": "Get shimmer (apq11)",
        "shimmer_dda": "Get shimmer (dda)",
    }
    for key, cmd in shimmer_defs.items():
        try:
            val = (
                call([sound, pp], cmd, 0, 0, 0.0001, 0.02, 1.3, 1.6)
                if pp
                else None
            )
            features[key] = (
                float(val) if val is not None and np.isfinite(val) else None
            )
        except Exception:
            features[key] = None

    # HNR
    try:
        harm = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
        features["hnr"] = float(call(harm, "Get mean", 0, 0))
    except Exception:
        features["hnr"] = None

    # NHR (noise-to-harmonics = 1 / HNR_linear)
    try:
        if features.get("hnr") is not None and features["hnr"] != 0:
            features["nhr"] = float(1.0 / (10 ** (features["hnr"] / 10)))
        else:
            features["nhr"] = None
    except Exception:
        features["nhr"] = None

    # CPP
    try:
        features["cpp"] = _compute_cpp(y, sr)
    except Exception:
        features["cpp"] = None

    # F0 statistics
    try:
        pitch = call(sound, "To Pitch", 0.0, 75, 500)
        f0v = pitch.selected_array["frequency"]
        f0v = f0v[f0v > 0]
        if len(f0v) > 0:
            features.update({
                "f0_mean": float(np.mean(f0v)),
                "f0_sd": float(np.std(f0v)),
                "f0_min": float(np.min(f0v)),
                "f0_max": float(np.max(f0v)),
                "f0_range": float(np.max(f0v) - np.min(f0v)),
            })
        else:
            for k in ("f0_mean", "f0_sd", "f0_min", "f0_max", "f0_range"):
                features[k] = None
    except Exception:
        for k in ("f0_mean", "f0_sd", "f0_min", "f0_max", "f0_range"):
            features[k] = None

    # RPDE
    try:
        step = max(1, len(y) // 5000)
        rpde = nolds.sampen(y[::step].astype(np.float64), emb_dim=2)
        features["rpde"] = float(rpde) if np.isfinite(rpde) else None
    except Exception:
        features["rpde"] = None

    # DFA
    try:
        step = max(1, len(y) // 5000)
        features["dfa"] = float(nolds.dfa(y[::step].astype(np.float64)))
    except Exception:
        features["dfa"] = None

    # PPE (Pitch Period Entropy)
    try:
        pitch = call(sound, "To Pitch", 0.0, 75, 500)
        f0v = pitch.selected_array["frequency"]
        f0v = f0v[f0v > 0]
        if len(f0v) > 2:
            st = 12.0 * np.log2(f0v[1:] / f0v[:-1])
            h, _ = np.histogram(st, bins=30, density=True)
            h = h[h > 0]
            h = h / h.sum()
            features["ppe"] = float(-np.sum(h * np.log2(h)))
        else:
            features["ppe"] = None
    except Exception:
        features["ppe"] = None

    # D2 (correlation dimension)
    try:
        step = max(1, len(y) // 3000)
        d2 = nolds.corr_dim(y[::step].astype(np.float64), emb_dim=10)
        features["d2"] = float(d2) if np.isfinite(d2) else None
    except Exception:
        features["d2"] = None

    return features


# ============================================================================
# DDK (/pataka/ micro-task)
# ============================================================================

def extract_ddk(y, sr):
    """DDK rate, regularity (CV of IOIs), festination detection."""
    import librosa
    features = {}

    # Detect syllable onsets
    try:
        frames = librosa.onset.onset_detect(
            y=y, sr=sr, units="frames", hop_length=512, backtrack=True,
            pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.07, wait=4,
        )
        times = librosa.frames_to_time(frames, sr=sr, hop_length=512)
        features["onset_count"] = int(len(times))
    except Exception:
        for k in (
            "onset_count", "ddk_rate", "ddk_regularity_cv",
            "ddk_mean_ioi", "ddk_sd_ioi", "festination",
        ):
            features[k] = None
        return features

    # DDK rate (syllables/second)
    try:
        dur = times[-1] - times[0] if len(times) >= 2 else 0
        features["ddk_rate"] = float(len(times) / dur) if dur > 0 else None
    except Exception:
        features["ddk_rate"] = None

    # Inter-onset intervals + regularity CV
    try:
        if len(times) >= 3:
            ioi = np.diff(times)
            ioi = ioi[ioi > 0]
            features["ddk_mean_ioi"] = float(np.mean(ioi))
            features["ddk_sd_ioi"] = float(np.std(ioi))
            features["ddk_regularity_cv"] = (
                float(np.std(ioi) / np.mean(ioi)) if np.mean(ioi) > 0 else None
            )
        else:
            features["ddk_mean_ioi"] = None
            features["ddk_sd_ioi"] = None
            features["ddk_regularity_cv"] = None
    except Exception:
        features["ddk_mean_ioi"] = None
        features["ddk_sd_ioi"] = None
        features["ddk_regularity_cv"] = None

    # Festination: later intervals systematically shorter (PD marker)
    try:
        if len(times) >= 6:
            ioi = np.diff(times)
            ioi = ioi[ioi > 0]
            if len(ioi) >= 4:
                mid = len(ioi) // 2
                ratio = (
                    np.mean(ioi[mid:]) / np.mean(ioi[:mid])
                    if np.mean(ioi[:mid]) > 0
                    else 1.0
                )
                features["festination"] = bool(ratio < 0.85)  # >=15% acceleration
            else:
                features["festination"] = None
        else:
            features["festination"] = None
    except Exception:
        features["festination"] = None

    return features


# ============================================================================
# Vowel space: formant-based articulation metrics
# ============================================================================

def extract_vowel_space(sound):
    """F1/F2 tracking, VSA (if multiple vowels), VAI proxy."""
    from parselmouth.praat import call
    features = {}

    try:
        formant = call(sound, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)
        n = call(formant, "Get number of frames")
        f1s, f2s = [], []
        for i in range(1, n + 1):
            t = call(formant, "Get time from frame number", i)
            f1 = call(formant, "Get value at time", 1, t, "Hertz", "Linear")
            f2 = call(formant, "Get value at time", 2, t, "Hertz", "Linear")
            if not math.isnan(f1) and f1 > 0:
                f1s.append(f1)
            if not math.isnan(f2) and f2 > 0:
                f2s.append(f2)

        features["f1_mean"] = float(np.mean(f1s)) if f1s else None
        features["f2_mean"] = float(np.mean(f2s)) if f2s else None
        # VSA requires corner vowels /a/, /i/, /u/ -- not computable from single vowel
        features["vsa"] = None
        # VAI single-vowel proxy: F2/F1 ratio as articulatory spread
        if features["f1_mean"] and features["f2_mean"] and features["f1_mean"] > 0:
            features["vai"] = float(features["f2_mean"] / features["f1_mean"])
        else:
            features["vai"] = None
    except Exception:
        features["f1_mean"] = None
        features["f2_mean"] = None
        features["vsa"] = None
        features["vai"] = None

    return features


# ============================================================================
# Helpers (V4)
# ============================================================================

def _compute_cpp(y, sr):
    """Cepstral Peak Prominence: peak-to-regression difference in cepstrum."""
    from scipy.signal import get_window
    frame_len = int(0.04 * sr)  # 40ms
    hop = int(0.01 * sr)        # 10ms
    cpp_vals = []

    for start in range(0, len(y) - frame_len, hop):
        w = y[start:start + frame_len] * get_window("hann", frame_len)
        power = np.maximum(np.abs(np.fft.rfft(w)) ** 2, 1e-12)
        cep = np.fft.irfft(10 * np.log10(power))

        lo, hi = int(sr / 500), min(int(sr / 75), len(cep) - 1)  # 75-500 Hz
        if lo >= hi:
            continue
        region = cep[lo:hi]
        if len(region) == 0:
            continue

        x = np.arange(lo, lo + len(region))
        reg = np.polyval(np.polyfit(x, region, 1), x)
        peak = np.argmax(region)
        cpp_vals.append(region[peak] - reg[peak])

    return float(np.mean(cpp_vals)) if cpp_vals else None


def _compute_spectral_harmonicity(y, sr):
    """Harmonic-to-total energy ratio via librosa HPSS."""
    import librosa
    y_h, _ = librosa.effects.hpss(y)
    total = np.sum(y ** 2)
    return float(np.sum(y_h ** 2) / total) if total > 0 else None


# ============================================================================
# NEW V5: 6 acoustic features
# ============================================================================

def extract_v5_acoustic(sound, y, sr):
    """
    New V5 acoustic features:
      - formant_bandwidth : mean F1 bandwidth (Hz)
      - spectral_tilt     : slope of log power spectrum (dB/Hz)
      - voice_breaks      : rate of voiced-to-unvoiced transitions per second
      - tremor_freq_power : power in 4-7 Hz band of F0 contour
      - breathiness_h1h2  : mean H1-H2 (dB), correlate of breathiness
      - loudness_decay    : linear slope of RMS energy across utterance
    """
    from parselmouth.praat import call
    features = {}

    # --- Formant bandwidth (mean F1 bandwidth) ---
    try:
        formant = call(sound, "To Formant (burg)", 0.0, 5, 5500, 0.025, 50)
        n_frames = call(formant, "Get number of frames")
        bw_vals = []
        for i in range(1, n_frames + 1):
            t = call(formant, "Get time from frame number", i)
            bw = call(formant, "Get bandwidth at time", 1, t, "Hertz", "Linear")
            if not math.isnan(bw) and bw > 0:
                bw_vals.append(bw)
        features["formant_bandwidth"] = (
            float(np.mean(bw_vals)) if bw_vals else None
        )
    except Exception:
        features["formant_bandwidth"] = None

    # --- Spectral tilt (linear regression slope of log power spectrum) ---
    try:
        # Use windowed FFT of the full signal
        n_fft = min(len(y), 2 * sr)  # up to 2s window
        segment = y[:n_fft]
        window = np.hanning(len(segment))
        spectrum = np.abs(np.fft.rfft(segment * window))
        log_spectrum = 20.0 * np.log10(np.maximum(spectrum, 1e-10))
        freqs = np.linspace(0, sr / 2, len(log_spectrum))
        # Fit only within speech-relevant range (50-8000 Hz)
        mask = (freqs >= 50) & (freqs <= 8000)
        if np.sum(mask) > 2:
            slope, _ = np.polyfit(freqs[mask], log_spectrum[mask], 1)
            features["spectral_tilt"] = float(slope)
        else:
            features["spectral_tilt"] = None
    except Exception:
        features["spectral_tilt"] = None

    # --- Voice breaks (voiced-to-unvoiced transition rate) ---
    try:
        pitch = call(sound, "To Pitch", 0.0, 75, 500)
        f0 = pitch.selected_array["frequency"]
        if len(f0) > 1:
            voiced = f0 > 0
            # Count transitions from voiced to unvoiced within voiced regions
            # A voice break = a gap of unvoiced frames surrounded by voiced frames
            transitions = np.diff(voiced.astype(int))
            # voiced->unvoiced = -1 in diff
            n_breaks = int(np.sum(transitions == -1))
            duration = float(len(y) / sr)
            features["voice_breaks"] = (
                float(n_breaks / duration) if duration > 0 else None
            )
        else:
            features["voice_breaks"] = None
    except Exception:
        features["voice_breaks"] = None

    # --- Tremor frequency (power in 4-7 Hz band of F0 contour) ---
    try:
        pitch = call(sound, "To Pitch", 0.0, 75, 500)
        f0 = pitch.selected_array["frequency"]
        voiced_idx = np.where(f0 > 0)[0]
        if len(voiced_idx) > 10:
            # Interpolate F0 over unvoiced gaps for continuous contour
            f0_interp = np.interp(
                np.arange(len(f0)), voiced_idx, f0[voiced_idx]
            )
            # Remove DC
            f0_centered = f0_interp - np.mean(f0_interp)
            # FFT of F0 contour
            fft_f0 = np.abs(np.fft.rfft(f0_centered))
            # Pitch time step in Praat default: 0.0 => auto = 0.75 / floor
            # With floor=75 Hz, step ~= 0.01s
            hop_time = call(pitch, "Get time step")
            freqs = np.fft.rfftfreq(len(f0_interp), d=hop_time)
            tremor_band = (freqs >= 4.0) & (freqs <= 7.0)
            if np.any(tremor_band):
                total_power = np.sum(fft_f0 ** 2) + 1e-12
                tremor_power = np.sum(fft_f0[tremor_band] ** 2)
                # Normalized tremor power (ratio)
                features["tremor_freq_power"] = float(tremor_power / total_power)
            else:
                features["tremor_freq_power"] = None
        else:
            features["tremor_freq_power"] = None
    except Exception:
        features["tremor_freq_power"] = None

    # --- Breathiness H1-H2 (difference between first two harmonics, dB) ---
    try:
        pitch = call(sound, "To Pitch", 0.0, 75, 500)
        f0_arr = pitch.selected_array["frequency"]
        voiced_idx = np.where(f0_arr > 0)[0]
        if len(voiced_idx) > 0:
            h1h2_vals = []
            # Compute H1-H2 at each voiced frame using short-time spectra
            frame_len = int(0.04 * sr)  # 40ms
            hop_samples = int(0.01 * sr)  # 10ms
            for vi in voiced_idx[::3]:  # subsample for speed
                f0_hz = f0_arr[vi]
                # Map pitch frame index to sample index
                hop_time = call(pitch, "Get time step")
                t_sec = vi * hop_time + call(pitch, "Get time from frame number", 1)
                center = int(t_sec * sr)
                start_idx = center - frame_len // 2
                end_idx = start_idx + frame_len
                if start_idx < 0 or end_idx > len(y):
                    continue
                frame = y[start_idx:end_idx] * np.hanning(frame_len)
                spectrum = np.abs(np.fft.rfft(frame))
                freqs = np.fft.rfftfreq(frame_len, d=1.0 / sr)
                # Find H1 (amplitude at F0) and H2 (amplitude at 2*F0)
                h1_idx = np.argmin(np.abs(freqs - f0_hz))
                h2_idx = np.argmin(np.abs(freqs - 2 * f0_hz))
                h1_amp = spectrum[h1_idx]
                h2_amp = spectrum[h2_idx]
                if h1_amp > 0 and h2_amp > 0:
                    h1h2_db = 20.0 * np.log10(h1_amp / h2_amp)
                    h1h2_vals.append(h1h2_db)
            features["breathiness_h1h2"] = (
                float(np.mean(h1h2_vals)) if h1h2_vals else None
            )
        else:
            features["breathiness_h1h2"] = None
    except Exception:
        features["breathiness_h1h2"] = None

    # --- Loudness decay (slope of RMS energy across utterance) ---
    try:
        # Compute RMS energy in short frames
        frame_len_ld = int(0.025 * sr)  # 25ms
        hop_ld = int(0.010 * sr)        # 10ms
        n_frames_ld = 1 + (len(y) - frame_len_ld) // hop_ld
        if n_frames_ld > 2:
            frame_energies = np.zeros(n_frames_ld)
            for i in range(n_frames_ld):
                s = i * hop_ld
                frame_energies[i] = np.sqrt(np.mean(y[s:s + frame_len_ld] ** 2))
            # Normalize time axis to seconds
            time_axis = np.arange(n_frames_ld) * (hop_ld / sr)
            slope, _ = np.polyfit(time_axis, frame_energies, 1)
            features["loudness_decay"] = float(slope)
        else:
            features["loudness_decay"] = None
    except Exception:
        features["loudness_decay"] = None

    return features


# ============================================================================
# NEW V5: Whisper transcription with word-level timestamps
# ============================================================================

def extract_whisper_timestamps(audio_path, model_name="large-v3", device="cpu"):
    """
    Run Whisper with word-level timestamps.

    Returns
    -------
    dict with keys:
      - transcript : str
      - model      : str
      - words      : list of {word: str, start: float, end: float}

    Returns None if Whisper is unavailable.
    """
    try:
        import whisper  # type: ignore
    except ImportError:
        return None

    try:
        # Whisper device handling: 'mps' not yet fully supported by whisper;
        # fall back to cpu for mps.
        whisper_device = device if device in ("cpu", "cuda") else "cpu"
        model = whisper.load_model(model_name, device=whisper_device)
        result = model.transcribe(
            audio_path,
            word_timestamps=True,
            language="en",
        )

        transcript = result.get("text", "").strip()
        words = []
        for segment in result.get("segments", []):
            for word_info in segment.get("words", []):
                words.append({
                    "word": word_info["word"].strip(),
                    "start": round(word_info["start"], 3),
                    "end": round(word_info["end"], 3),
                })

        return {
            "transcript": transcript,
            "model": model_name,
            "words": words,
        }
    except Exception:
        return None


# ============================================================================
# NEW V5: Temporal indicators from Whisper word timestamps
# ============================================================================

def _estimate_syllable_count(word):
    """Rough syllable count heuristic based on vowel clusters."""
    word = word.lower().strip()
    if not word:
        return 1
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for ch in word:
        if ch in vowels:
            if not prev_vowel:
                count += 1
            prev_vowel = True
        else:
            prev_vowel = False
    # Handle silent-e
    if word.endswith("e") and count > 1:
        count -= 1
    return max(count, 1)


def _is_likely_noun(word):
    """
    Heuristic: a word is likely a noun if it is longer than 4 characters and
    is NOT in the function-word list. This is a rough approximation without a
    POS tagger.
    """
    w = word.lower().strip(".,!?;:\"'()-")
    if len(w) <= 4:
        return False
    if w in _FUNCTION_WORDS:
        return False
    return True


def compute_temporal_from_whisper(words, total_duration_s):
    """
    Compute V5 temporal indicators from Whisper word timestamps.

    Parameters
    ----------
    words : list of dict
        Each dict has keys: word, start, end.
    total_duration_s : float
        Total audio duration in seconds.

    Returns
    -------
    dict with keys:
      - pause_before_noun   : mean pause (s) before likely-noun words
      - pause_variability   : CV of inter-word pause durations
      - syllable_rate_decay : ratio of syllable rate in 2nd half to 1st half
      - word_duration_mean  : mean word duration (s)
      - voiced_ratio        : total voiced time / total audio duration
    """
    temporal = {}

    if not words or len(words) < 2:
        return {
            "pause_before_noun": None,
            "pause_variability": None,
            "syllable_rate_decay": None,
            "word_duration_mean": None,
            "voiced_ratio": None,
        }

    # --- Compute inter-word pauses ---
    pauses = []
    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        pauses.append(max(gap, 0.0))

    # --- pause_before_noun ---
    try:
        noun_pauses = []
        for i in range(1, len(words)):
            if _is_likely_noun(words[i]["word"]):
                gap = words[i]["start"] - words[i - 1]["end"]
                noun_pauses.append(max(gap, 0.0))
        temporal["pause_before_noun"] = (
            round(float(np.mean(noun_pauses)), 4) if noun_pauses else None
        )
    except Exception:
        temporal["pause_before_noun"] = None

    # --- pause_variability (CV of all inter-word pauses) ---
    try:
        if len(pauses) >= 2:
            mean_p = np.mean(pauses)
            sd_p = np.std(pauses)
            temporal["pause_variability"] = (
                round(float(sd_p / mean_p), 4) if mean_p > 0 else None
            )
        else:
            temporal["pause_variability"] = None
    except Exception:
        temporal["pause_variability"] = None

    # --- syllable_rate_decay ---
    try:
        # Split words into first and second halves by time
        mid_time = (words[0]["start"] + words[-1]["end"]) / 2.0
        syl_first, dur_first = 0, 0.0
        syl_second, dur_second = 0, 0.0
        for w in words:
            wdur = w["end"] - w["start"]
            nsyl = _estimate_syllable_count(w["word"])
            if w["start"] + wdur / 2 < mid_time:
                syl_first += nsyl
                dur_first += wdur
            else:
                syl_second += nsyl
                dur_second += wdur
        rate_first = syl_first / dur_first if dur_first > 0 else 0
        rate_second = syl_second / dur_second if dur_second > 0 else 0
        temporal["syllable_rate_decay"] = (
            round(float(rate_second / rate_first), 4)
            if rate_first > 0
            else None
        )
    except Exception:
        temporal["syllable_rate_decay"] = None

    # --- word_duration_mean ---
    try:
        durations = [w["end"] - w["start"] for w in words]
        durations = [d for d in durations if d > 0]
        temporal["word_duration_mean"] = (
            round(float(np.mean(durations)), 4) if durations else None
        )
    except Exception:
        temporal["word_duration_mean"] = None

    # --- voiced_ratio (total word time / total audio duration) ---
    try:
        total_word_time = sum(
            max(w["end"] - w["start"], 0) for w in words
        )
        temporal["voiced_ratio"] = (
            round(float(total_word_time / total_duration_s), 4)
            if total_duration_s > 0
            else None
        )
    except Exception:
        temporal["voiced_ratio"] = None

    return temporal


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="MemoVoice CVF V5 GPU-accelerated acoustic feature extraction"
    )
    parser.add_argument(
        "--audio-path", required=True, help="Path to input WAV file"
    )
    parser.add_argument(
        "--task-type", required=True,
        choices=["conversation", "sustained_vowel", "ddk", "fluency"],
        help="Micro-task type",
    )
    parser.add_argument(
        "--gender", default="female", choices=["male", "female"],
        help="Speaker gender for F0 normalization",
    )
    parser.add_argument(
        "--gpu", action="store_true", default=False,
        help="Prefer GPU acceleration (MPS/CUDA) when available",
    )
    parser.add_argument(
        "--whisper-model", default="large-v3",
        help="Whisper model name (default: large-v3)",
    )
    parser.add_argument(
        "--word-timestamps", action="store_true", default=False,
        help="Enable Whisper word-level timestamp extraction",
    )
    args = parser.parse_args()

    # --- Validate audio path ---
    audio_path = os.path.realpath(args.audio_path)
    if not os.path.isfile(audio_path):
        print(json.dumps({
            "status": "error",
            "error": "Audio file not found",
            "features": None,
        }))
        sys.exit(1)

    # --- Validate task_type ---
    valid_tasks = {"conversation", "sustained_vowel", "ddk", "fluency"}
    if args.task_type not in valid_tasks:
        print(json.dumps({
            "status": "error",
            "error": "Invalid task type",
            "features": None,
        }))
        sys.exit(1)

    # --- Device detection ---
    device = get_device(prefer_gpu=args.gpu)

    try:
        import parselmouth

        # Load audio + GPU-accelerated MFCCs (with librosa fallback)
        y, sr, mfccs, audio_backend = load_audio_and_mfcc(
            audio_path, sr=16000, n_mfcc=13, device=device,
        )
        sound = parselmouth.Sound(audio_path)
        duration_s = float(len(y) / sr)

        f0_norms = {
            "male": {"mean": 120, "sd": 20},
            "female": {"mean": 210, "sd": 30},
        }

        result = {
            "task_type": args.task_type,
            "gender": args.gender,
            "duration_s": round(duration_s, 3),
            "sample_rate": sr,
            "device": device,
            "audio_backend": audio_backend,
            "f0_norm_ref": f0_norms[args.gender],
        }

        # ----- Feature extraction per task type -----
        if args.task_type == "conversation":
            v4_features = {
                **extract_tier1(sound, y, sr, mfccs=mfccs),
                **extract_tier2(sound, y, sr),
            }
            v5_features = extract_v5_acoustic(sound, y, sr)
            result["features"] = {**v4_features, **v5_features}

        elif args.task_type == "sustained_vowel":
            v4_features = {
                **extract_sustained_vowel(sound, y, sr),
                **extract_vowel_space(sound),
            }
            v5_features = extract_v5_acoustic(sound, y, sr)
            result["features"] = {**v4_features, **v5_features}

        elif args.task_type == "ddk":
            result["features"] = extract_ddk(y, sr)

        elif args.task_type == "fluency":
            v4_features = extract_tier1(sound, y, sr, mfccs=mfccs)
            v5_features = extract_v5_acoustic(sound, y, sr)
            result["features"] = {**v4_features, **v5_features}

        else:
            result["features"] = {}

        # Sanitize numeric features
        if "features" in result and isinstance(result["features"], dict):
            result["features"] = sanitize_features(result["features"])

        # ----- Whisper transcription + word timestamps -----
        if args.word_timestamps:
            whisper_result = extract_whisper_timestamps(
                audio_path,
                model_name=args.whisper_model,
                device=device,
            )
            if whisper_result is not None:
                result["whisper"] = whisper_result
                # Compute temporal indicators from word timestamps
                result["temporal"] = compute_temporal_from_whisper(
                    whisper_result["words"], duration_s,
                )
            else:
                result["whisper"] = None
                result["temporal"] = {
                    "pause_before_noun": None,
                    "pause_variability": None,
                    "syllable_rate_decay": None,
                    "word_duration_mean": None,
                    "voiced_ratio": None,
                }
        else:
            result["whisper"] = None
            result["temporal"] = None

        result["status"] = "ok"
        print(json.dumps(result))

    except Exception as exc:
        print(json.dumps({
            "status": "error",
            "error": f"Feature extraction failed: {str(exc)}",
            "features": None,
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
