/**
 * V5 CVF API — Fastify Plugin
 *
 * 17 endpoints for the V5 deep-voice engine.
 * Prefix: /cvf/v5
 *
 * New in V5:
 *   - POST /process uses Opus 4.6 dual-pass extraction + deterministic NLP anchors
 *   - POST /process-audio with Whisper temporal indicators
 *   - POST /topic-detect — detect topic genre from transcript (NEW)
 *   - POST /cross-validate — batch cross-validation analysis (NEW)
 *   - GET /pd/:patientId for PD-specific analysis (11 domains)
 *   - GET /micro-tasks/:patientId for scheduled micro-task recommendations
 *   - 107 indicators, 11 domains, 10-condition differential, 30 rules
 *   - Topic-genre aware scoring eliminates 44% false positives
 *   - Per-indicator confidence tracking from dual-pass extraction
 */

import {
  computeV5Baseline,
  analyzeSession,
  analyzeWeek,
  computeZScores,
  computeDomainScores,
  computeComposite,
  getAlertLevel,
  detectCascade,
  checkSentinels,
  computeDeclineProfile,
  ALERT_THRESHOLDS,
  runDifferential,
  predictTrajectory,
  extractV5Features,
  extractV5EarlyDetection,
  extractAcousticFeatures,
  extractMicroTaskAudio,
  convertToWav,
  cleanupAudioTemp,
  runPDAnalysis,
  MICRO_TASKS,
  getScheduledTasks,
  scoreMicroTask,
  runWeeklyDeepAnalysis,
  loadWeeklyReport,
  listWeeklyReports,
  batchAnalyzeWithCrossValidation,
  splitHalfCrossValidation,
  aggregateCrossValidatedResults,
  detectTopicGenre,
  applyTopicAdjustments,
  INDICATORS,
  ALL_INDICATOR_IDS,
  INDICATOR_COUNT,
  DOMAINS,
  DOMAIN_WEIGHTS,
  AUDIO_INDICATORS,
  WHISPER_TEMPORAL_INDICATORS,
  SENTINELS,
  V5_META,
} from './index.js';

import crypto from 'crypto';
import { performance } from 'perf_hooks';

const PATIENT_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_PATIENTS = 10000;
const MAX_SESSIONS_PER_PATIENT = 1000;

// ════════════════════════════════════════════════
// PERFORMANCE METRICS
// ════════════════════════════════════════════════

const RING_BUFFER_SIZE = 50;

const metrics = {
  started_at: new Date().toISOString(),
  sessions_processed: 0,
  sessions_failed: 0,
  audio_extractions: 0,
  audio_failures: 0,
  weekly_analyses: 0,
  weekly_failures: 0,
  micro_tasks_processed: 0,
  topic_detections: 0,
  cross_validations: 0,
  last_processing_times: [],
  text_extraction_total_ms: 0,
  audio_extraction_total_ms: 0,
  analysis_total_ms: 0,
};

function pushProcessingTime(entry) {
  metrics.last_processing_times.push(entry);
  if (metrics.last_processing_times.length > RING_BUFFER_SIZE) {
    metrics.last_processing_times.shift();
  }
}

function validatePatientId(patientId) {
  if (!patientId || !PATIENT_ID_REGEX.test(patientId)) {
    throw { statusCode: 400, message: 'Invalid patientId: must be 1-64 alphanumeric/dash/underscore characters' };
  }
}

// ════════════════════════════════════════════════
// IN-MEMORY STORAGE (demo purposes)
// ════════════════════════════════════════════════

const patients = new Map();
const sessions = new Map();    // patientId -> [session, ...]
const baselines = new Map();   // patientId -> baseline

function getPatient(patientId) { return patients.get(patientId) || null; }
function savePatientLocal(patient) {
  if (!patients.has(patient.patient_id) && patients.size >= MAX_PATIENTS) {
    throw { statusCode: 503, message: 'Maximum patient capacity reached' };
  }
  patients.set(patient.patient_id, patient);
}

function getPatientSessions(patientId) { return sessions.get(patientId) || []; }
function pushSession(patientId, session) {
  if (!sessions.has(patientId)) sessions.set(patientId, []);
  const patientSessions = sessions.get(patientId);
  if (patientSessions.length >= MAX_SESSIONS_PER_PATIENT) {
    throw { statusCode: 503, message: 'Maximum sessions per patient reached' };
  }
  patientSessions.push(session);
}

function getBaseline(patientId) { return baselines.get(patientId) || null; }
function saveBaselineLocal(patientId, baseline) { baselines.set(patientId, baseline); }

// ════════════════════════════════════════════════
// PLUGIN
// ════════════════════════════════════════════════

export default async function v5Routes(app) {

  // ────────────────────────────────────────────
  // 1. POST /process — Daily session (text + optional audio)
  // ────────────────────────────────────────────
  app.post('/process', {
    schema: {
      body: {
        type: 'object',
        required: ['patientId', 'transcript'],
        properties: {
          patientId: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[a-zA-Z0-9_-]+$' },
          transcript: {
            type: 'array',
            items: {
              type: 'object',
              required: ['role', 'text'],
              properties: {
                role: { type: 'string', enum: ['patient', 'assistant'] },
                text: { type: 'string', minLength: 1, maxLength: 10000 },
              },
              additionalProperties: false,
            },
          },
          audioBase64: { type: 'string', maxLength: 10485760 },
          audioFormat: { type: 'string', default: 'wav', enum: ['wav', 'mp3', 'ogg', 'webm', 'flac'] },
          language: { type: 'string', default: 'fr', enum: ['fr', 'en'] },
          confounders: { type: 'object', additionalProperties: { type: 'boolean' } },
          durationSeconds: { type: 'number', minimum: 0, maximum: 3600 },
          mode: { type: 'string', enum: ['full', 'early_detection'], default: 'full' },
        }
      }
    }
  }, async (request, reply) => {
    const { patientId, transcript, audioBase64, audioFormat, language, confounders, durationSeconds, mode } = request.body;
    const processStart = performance.now();
    const patientHash = crypto.createHash('sha256').update(patientId).digest('hex').slice(0, 8);

    try {

    let patient = getPatient(patientId);
    if (!patient) {
      // Auto-create patient for demo
      patient = { patient_id: patientId, first_name: patientId, language: language || 'fr', alert_level: 'green' };
      savePatientLocal(patient);
    }

    console.log(`[V5] Processing session for patient_${patientHash} (mode=${mode}, audio=${audioBase64 ? 'yes' : 'no'})...`);

    // Detect topic genre from transcript (V5 new)
    const topicResult = detectTopicGenre(transcript);
    const topicGenre = topicResult?.genre || null;

    // Run text extraction and audio pipeline in parallel
    const textStart = performance.now();
    const textPromise = mode === 'early_detection'
      ? extractV5EarlyDetection(transcript, { language: language || patient.language })
      : extractV5Features(transcript, { language: language || patient.language });

    let audioPromise = null;
    let audioTempFiles = [];
    const audioStart = performance.now();
    if (audioBase64) {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      audioPromise = extractAcousticFeatures(audioBuffer, {
        format: audioFormat || 'wav',
        gender: patient.gender || 'unknown',
      }).catch(err => {
        console.error('[V5] Audio extraction failed, continuing with text only:', err.message);
        metrics.audio_failures++;
        return {};
      });
    }

    const [textResult, audioVector] = await Promise.all([
      textPromise,
      audioPromise || Promise.resolve({}),
    ]);
    const textDuration = performance.now() - textStart;
    metrics.text_extraction_total_ms += textDuration;
    if (audioBase64 && audioVector && Object.keys(audioVector).length > 0) {
      metrics.audio_extractions++;
      metrics.audio_extraction_total_ms += performance.now() - audioStart;
    }

    // V5 dual-pass returns { vector, confidence } or plain vector
    const textVector = textResult?.vector || textResult;
    const indicatorConfidence = textResult?.confidence || null;

    // Merge text + audio vectors (only allow known AUDIO_INDICATORS)
    const mergedVector = { ...textVector };
    if (audioVector && typeof audioVector === 'object') {
      const audioOnlyIds = new Set(AUDIO_INDICATORS);
      for (const [key, value] of Object.entries(audioVector)) {
        if (audioOnlyIds.has(key) && value !== null && value !== undefined) {
          mergedVector[key] = value;
        }
      }
    }

    // Create session record
    const session = {
      session_id: `s_${Date.now()}_${crypto.randomUUID()}`,
      patient_id: patientId,
      language: language || patient.language,
      timestamp: new Date().toISOString(),
      duration_seconds: durationSeconds,
      confounders: confounders || {},
      feature_vector: mergedVector,
      extraction_model: mode === 'early_detection' ? 'opus-early-v5' : 'opus-dual-v5',
      has_audio: !!audioBase64,
      topic_genre: topicGenre,
      topic_confidence: topicResult?.confidence || null,
      indicator_confidence: indicatorConfidence,
      v5: true,
    };
    pushSession(patientId, session);

    // Check/compute baseline
    let baseline = getBaseline(patientId);
    const allSessions = getPatientSessions(patientId);
    const v5Sessions = allSessions.filter(s => s.feature_vector);

    if (!baseline?.complete) {
      const baselineResult = computeV5Baseline(v5Sessions.map(s => s.feature_vector));
      if (baselineResult.complete) {
        baseline = baselineResult;
        saveBaselineLocal(patientId, baseline);
        patient.baseline_established = true;
        patient.baseline_sessions = baselineResult.sessions;
        savePatientLocal(patient);
        console.log(`[V5] Baseline established for patient_${crypto.createHash('sha256').update(patientId).digest('hex').slice(0, 8)} (${baselineResult.sessions} sessions)`);
      }
      metrics.sessions_processed++;
      const duration = performance.now() - processStart;
      pushProcessingTime({ timestamp: new Date().toISOString(), duration_ms: Math.round(duration), type: 'session', patient_hash: patientHash });
      return {
        status: 'calibrating',
        version: 'v5',
        session_id: session.session_id,
        has_audio: session.has_audio,
        topic_genre: topicGenre,
        sessions_complete: v5Sessions.length,
        sessions_target: 14,
        phase: v5Sessions.length <= 3 ? 'rapport_building' : v5Sessions.length <= 7 ? 'deep_calibration' : 'consolidation',
      };
    }

    // Analyze session against baseline (pass topic_genre and indicator_confidence)
    const analysisStart = performance.now();
    const history = v5Sessions.slice(-14).map(s => ({
      domain_scores: s._cached_domain_scores || {},
      composite: s._cached_composite,
    }));
    const result = analyzeSession(mergedVector, baseline.vector, confounders || {}, history, topicGenre, indicatorConfidence);
    metrics.analysis_total_ms += performance.now() - analysisStart;

    // Cache for history building
    session._cached_domain_scores = result.domain_scores;
    session._cached_composite = result.composite;

    // Update alert level
    const alertSeverity = { green: 0, yellow: 1, orange: 2, red: 3 };
    if (alertSeverity[result.alert_level] > alertSeverity[patient.alert_level || 'green']) {
      patient.alert_level = result.alert_level;
      savePatientLocal(patient);
    }

    metrics.sessions_processed++;
    const duration = performance.now() - processStart;
    pushProcessingTime({ timestamp: new Date().toISOString(), duration_ms: Math.round(duration), type: 'session', patient_hash: patientHash });

    return {
      status: 'analyzed',
      version: 'v5',
      session_id: session.session_id,
      extraction_mode: mode,
      has_audio: session.has_audio,
      audio_indicators_extracted: audioBase64 ? Object.keys(audioVector || {}).length : 0,
      topic_genre: topicGenre,
      topic_confidence: topicResult?.confidence || null,
      indicator_confidence: indicatorConfidence,
      ...result,
    };

    } catch (err) {
      metrics.sessions_failed++;
      const duration = performance.now() - processStart;
      pushProcessingTime({ timestamp: new Date().toISOString(), duration_ms: Math.round(duration), type: 'session_error', patient_hash: patientHash });
      throw err;
    }
  });

  // ────────────────────────────────────────────
  // 2. POST /process-audio — Audio-only micro-task processing
  // ────────────────────────────────────────────
  app.post('/process-audio', {
    schema: {
      body: {
        type: 'object',
        required: ['patientId', 'audioBase64', 'taskType'],
        properties: {
          patientId: { type: 'string' },
          audioBase64: { type: 'string' },
          audioFormat: { type: 'string', default: 'wav' },
          taskType: { type: 'string', enum: ['sustained_vowel', 'ddk', 'category_fluency', 'depression_screen', 'attention_fluctuation', 'pragmatic_probe'] },
          language: { type: 'string', default: 'fr' },
        }
      }
    }
  }, async (request, reply) => {
    const { patientId, audioBase64, audioFormat, taskType, language } = request.body;
    const audioStart = performance.now();
    const patientHash = crypto.createHash('sha256').update(patientId).digest('hex').slice(0, 8);

    const patient = getPatient(patientId);
    if (!patient) return reply.code(404).send({ error: 'Patient not found' });

    console.log(`[V5] Processing ${taskType} micro-task audio for patient_${patientHash}...`);

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const features = await extractMicroTaskAudio(audioBuffer, taskType, {
      format: audioFormat || 'wav',
      gender: patient.gender || 'unknown',
    });

    const taskResult = scoreMicroTask(taskType, features);

    metrics.micro_tasks_processed++;
    metrics.audio_extractions++;
    const duration = performance.now() - audioStart;
    metrics.audio_extraction_total_ms += duration;
    pushProcessingTime({ timestamp: new Date().toISOString(), duration_ms: Math.round(duration), type: 'audio', patient_hash: patientHash });

    return {
      version: 'v5',
      patient_id: patientId,
      task_type: taskType,
      timestamp: new Date().toISOString(),
      features,
      score: taskResult,
    };
  });

  // ────────────────────────────────────────────
  // 3. POST /weekly — Weekly Opus deep analysis
  // ────────────────────────────────────────────
  app.post('/weekly', {
    schema: {
      body: {
        type: 'object',
        required: ['patientId', 'weekNumber'],
        properties: {
          patientId: { type: 'string' },
          weekNumber: { type: 'number' },
          microTaskResults: { type: 'object' },
        }
      }
    }
  }, async (request, reply) => {
    const { patientId, weekNumber, microTaskResults } = request.body;
    const weeklyStart = performance.now();
    const patientHash = crypto.createHash('sha256').update(patientId).digest('hex').slice(0, 8);

    const patient = getPatient(patientId);
    if (!patient) return reply.code(404).send({ error: 'Patient not found' });

    const baseline = getBaseline(patientId);
    if (!baseline?.complete) return reply.code(400).send({ error: 'Baseline not established' });

    const allSessions = getPatientSessions(patientId);
    const recentSessions = allSessions.filter(s => s.feature_vector).slice(-7);
    if (recentSessions.length === 0) return reply.code(400).send({ error: 'No sessions available' });

    const weeklyHistory = await listWeeklyReports(patientId);

    try {
      const report = await runWeeklyDeepAnalysis({
        patient, baseline, sessions: recentSessions, weeklyHistory, weekNumber, microTaskResults,
      });

      metrics.weekly_analyses++;
      const duration = performance.now() - weeklyStart;
      pushProcessingTime({ timestamp: new Date().toISOString(), duration_ms: Math.round(duration), type: 'weekly', patient_hash: patientHash });

      return report;
    } catch (err) {
      metrics.weekly_failures++;
      throw err;
    }
  });

  // ────────────────────────────────────────────
  // 4. GET /drift/:patientId — Latest drift
  // ────────────────────────────────────────────
  app.get('/drift/:patientId', {
    schema: { params: { type: 'object', properties: { patientId: { type: 'string' } } } }
  }, async (request, reply) => {
    const { patientId } = request.params;
    const baseline = getBaseline(patientId);
    if (!baseline?.complete) return reply.code(400).send({ error: 'Baseline not established' });

    const allSessions = getPatientSessions(patientId);
    const latest = allSessions.filter(s => s.feature_vector).pop();
    if (!latest) return reply.code(400).send({ error: 'No sessions' });

    const result = analyzeSession(latest.feature_vector, baseline.vector, latest.confounders || {}, [], latest.topic_genre || null, latest.indicator_confidence || null);

    return { version: 'v5', patient_id: patientId, session_id: latest.session_id, timestamp: latest.timestamp, has_audio: latest.has_audio, topic_genre: latest.topic_genre || null, ...result };
  });

  // ────────────────────────────────────────────
  // 5. GET /timeline/:patientId — Full timeline
  // ────────────────────────────────────────────
  app.get('/timeline/:patientId', {
    schema: { params: { type: 'object', properties: { patientId: { type: 'string' } } } }
  }, async (request, reply) => {
    const { patientId } = request.params;
    const patient = getPatient(patientId);
    if (!patient) return reply.code(404).send({ error: 'Patient not found' });

    const baseline = getBaseline(patientId);
    const allSessions = getPatientSessions(patientId);

    const timeline = allSessions.filter(s => s.feature_vector).map(session => {
      const entry = {
        session_id: session.session_id,
        timestamp: session.timestamp,
        confounders: session.confounders,
        has_audio: session.has_audio || false,
        topic_genre: session.topic_genre || null,
      };
      if (baseline?.complete) {
        const result = analyzeSession(session.feature_vector, baseline.vector, session.confounders || {}, [], session.topic_genre || null, session.indicator_confidence || null);
        entry.composite = result.composite;
        entry.alert_level = result.alert_level;
        entry.domain_scores = result.domain_scores;
        entry.sentinel_alerts = result.sentinel_alerts;
        entry.topic_adjusted = result.topic_adjusted || false;
      }
      return entry;
    });

    return {
      version: 'v5',
      patient,
      baseline_established: baseline?.complete || false,
      sessions_count: allSessions.length,
      indicator_count: INDICATOR_COUNT,
      domains: Object.keys(DOMAINS).length,
      timeline,
    };
  });

  // ────────────────────────────────────────────
  // 6. GET /differential/:patientId — 10-condition differential
  // ────────────────────────────────────────────
  app.get('/differential/:patientId', {
    schema: { params: { type: 'object', properties: { patientId: { type: 'string' } } } }
  }, async (request, reply) => {
    const { patientId } = request.params;
    const baseline = getBaseline(patientId);
    if (!baseline?.complete) return reply.code(400).send({ error: 'Baseline not established' });

    const allSessions = getPatientSessions(patientId);
    const recentSessions = allSessions.filter(s => s.feature_vector).slice(-7);
    if (recentSessions.length === 0) return reply.code(400).send({ error: 'No sessions' });

    const latest = recentSessions[recentSessions.length - 1];
    const result = analyzeSession(latest.feature_vector, baseline.vector, latest.confounders || {}, [], latest.topic_genre || null, latest.indicator_confidence || null);

    const timeline = allSessions.filter(s => s.feature_vector).map(s => {
      const r = analyzeSession(s.feature_vector, baseline.vector, s.confounders || {}, [], s.topic_genre || null, s.indicator_confidence || null);
      return { composite: r.composite };
    });
    const confounders = recentSessions.map(s => ({ confounders: s.confounders || {} }));

    const differential = runDifferential(result.domain_scores, result.z_scores, { timeline, confounders, sessionCount: recentSessions.length });

    return { version: 'v5', patient_id: patientId, conditions_detected: 10, rules: 30, ...differential };
  });

  // ────────────────────────────────────────────
  // 7. GET /trajectory/:patientId — 12-week prediction
  // ────────────────────────────────────────────
  app.get('/trajectory/:patientId', {
    schema: { params: { type: 'object', properties: { patientId: { type: 'string' } } } }
  }, async (request, reply) => {
    const { patientId } = request.params;
    const weeklyHistory = await listWeeklyReports(patientId);
    if (weeklyHistory.length < 3) return reply.code(400).send({ error: 'Need at least 3 weekly reports for trajectory prediction' });

    const latestDiff = weeklyHistory[weeklyHistory.length - 1]?.differential?.algorithmic;
    const latestCascade = weeklyHistory[weeklyHistory.length - 1]?.cascade;

    const trajectory = predictTrajectory(weeklyHistory, latestDiff, latestCascade);

    return { version: 'v5', patient_id: patientId, ...trajectory };
  });

  // ────────────────────────────────────────────
  // 8. GET /pd/:patientId — PD-specific analysis
  // ────────────────────────────────────────────
  app.get('/pd/:patientId', {
    schema: { params: { type: 'object', properties: { patientId: { type: 'string' } } } }
  }, async (request, reply) => {
    const { patientId } = request.params;
    const baseline = getBaseline(patientId);
    if (!baseline?.complete) return reply.code(400).send({ error: 'Baseline not established' });

    const allSessions = getPatientSessions(patientId);
    const v5Sessions = allSessions.filter(s => s.feature_vector);
    if (v5Sessions.length === 0) return reply.code(400).send({ error: 'No sessions' });

    const latest = v5Sessions[v5Sessions.length - 1];
    const hasAudio = AUDIO_INDICATORS.some(id => latest.feature_vector[id] !== null && latest.feature_vector[id] !== undefined);
    if (!hasAudio) return reply.code(400).send({ error: 'No audio data available. PD analysis requires acoustic features.' });

    const result = analyzeSession(latest.feature_vector, baseline.vector, latest.confounders || {}, [], latest.topic_genre || null, latest.indicator_confidence || null);

    const history = v5Sessions.slice(-14).map(s => {
      const r = analyzeSession(s.feature_vector, baseline.vector, s.confounders || {}, [], s.topic_genre || null, s.indicator_confidence || null);
      return { z_scores: r.z_scores, domain_scores: r.domain_scores };
    });

    const pdResult = runPDAnalysis(result.z_scores, result.domain_scores, baseline.vector, history);

    return {
      version: 'v5',
      patient_id: patientId,
      session_id: latest.session_id,
      timestamp: latest.timestamp,
      ...pdResult,
    };
  });

  // ────────────────────────────────────────────
  // 9. GET /micro-tasks/:patientId — Scheduled micro-tasks
  // ────────────────────────────────────────────
  app.get('/micro-tasks/:patientId', {
    schema: {
      params: { type: 'object', properties: { patientId: { type: 'string' } } },
      querystring: { type: 'object', properties: { weekNumber: { type: 'number' } } }
    }
  }, async (request, reply) => {
    const { patientId } = request.params;
    const weekNumber = request.query.weekNumber || 1;

    const patient = getPatient(patientId);
    if (!patient) return reply.code(404).send({ error: 'Patient not found' });

    const baseline = getBaseline(patientId);
    const allSessions = getPatientSessions(patientId);

    // Build a risk profile from latest session data
    let riskProfile = { conditions: [], alert_level: 'green' };
    if (baseline?.complete) {
      const v5Sessions = allSessions.filter(s => s.feature_vector);
      if (v5Sessions.length > 0) {
        const latest = v5Sessions[v5Sessions.length - 1];
        const result = analyzeSession(latest.feature_vector, baseline.vector, latest.confounders || {}, [], latest.topic_genre || null, latest.indicator_confidence || null);
        riskProfile.alert_level = result.alert_level;
        riskProfile.sentinel_alerts = result.sentinel_alerts || {};

        // Determine at-risk conditions from sentinel alerts
        if (result.sentinel_alerts?.alzheimer?.length > 0) riskProfile.conditions.push('alzheimer');
        if (result.sentinel_alerts?.depression?.length > 0) riskProfile.conditions.push('depression');
        if (result.sentinel_alerts?.parkinson?.length > 0) riskProfile.conditions.push('parkinson');
      }
    }

    const scheduledTasks = getScheduledTasks(riskProfile, weekNumber, []);

    return {
      version: 'v5',
      patient_id: patientId,
      week_number: weekNumber,
      risk_profile: riskProfile,
      scheduled_tasks: scheduledTasks,
      available_tasks: Object.values(MICRO_TASKS).map(t => ({
        id: t.id,
        duration: t.duration,
        conditions: t.conditions,
        frequency: t.frequency,
        description: t.description,
      })),
    };
  });

  // ────────────────────────────────────────────
  // 10. GET /report/:patientId/:weekNumber — Weekly report
  // ────────────────────────────────────────────
  app.get('/report/:patientId/:weekNumber', async (request, reply) => {
    const report = await loadWeeklyReport(request.params.patientId, parseInt(request.params.weekNumber));
    if (!report) return reply.code(404).send({ error: 'Report not found' });
    return report;
  });

  // ────────────────────────────────────────────
  // 11. GET /reports/:patientId — All reports
  // ────────────────────────────────────────────
  app.get('/reports/:patientId', async (request) => {
    return await listWeeklyReports(request.params.patientId);
  });

  // ────────────────────────────────────────────
  // 12. GET /indicators — V5 indicator catalog (107+)
  // ────────────────────────────────────────────
  app.get('/indicators', async () => {
    return {
      version: 'v5',
      count: INDICATOR_COUNT,
      streams: {
        text: ALL_INDICATOR_IDS.filter(id => INDICATORS[id].extractable === 'text' || INDICATORS[id].extractable === 'conversation').length,
        audio: AUDIO_INDICATORS.length,
        whisper_temporal: WHISPER_TEMPORAL_INDICATORS.length,
        micro_task: ALL_INDICATOR_IDS.filter(id => INDICATORS[id].extractable === 'micro_task').length,
        meta: ALL_INDICATOR_IDS.filter(id => INDICATORS[id].extractable === 'meta').length,
      },
      domains: Object.fromEntries(
        Object.entries(DOMAINS).map(([domain, ids]) => [
          domain,
          {
            weight: DOMAIN_WEIGHTS[domain],
            indicator_count: ids.length,
            indicators: ids.map(id => ({
              id,
              name: INDICATORS[id].name,
              domain: INDICATORS[id].domain,
              extractable: INDICATORS[id].extractable,
              evidence: INDICATORS[id].evidence,
              early_detection: INDICATORS[id].early_detection || {},
              effect_sizes: INDICATORS[id].effect_sizes || {},
            }))
          }
        ])
      ),
      sentinels: {
        alzheimer: SENTINELS.alzheimer,
        depression: SENTINELS.depression,
        parkinson: SENTINELS.parkinson,
      },
    };
  });

  // ────────────────────────────────────────────
  // 13. GET /baseline/:patientId — Baseline status
  // ────────────────────────────────────────────
  app.get('/baseline/:patientId', async (request) => {
    const baseline = getBaseline(request.params.patientId);
    if (!baseline) return { version: 'v5', status: 'not_started', sessions: 0, target: 14 };
    return {
      version: 'v5',
      status: baseline.complete ? 'established' : 'calibrating',
      sessions: baseline.sessions,
      target: 14,
      high_variance: baseline.high_variance || [],
      has_audio_baseline: baseline.has_audio || false,
    };
  });

  // ────────────────────────────────────────────
  // 14. GET /meta — V5_META
  // ────────────────────────────────────────────
  app.get('/meta', async () => {
    return {
      ...V5_META,
      alert_thresholds: ALERT_THRESHOLDS,
      domains: Object.fromEntries(
        Object.entries(DOMAIN_WEIGHTS).map(([d, w]) => [d, { weight: w, indicator_count: DOMAINS[d]?.length || 0 }])
      ),
      sentinels: {
        alzheimer: SENTINELS.alzheimer?.length || 0,
        depression: SENTINELS.depression?.length || 0,
        parkinson: SENTINELS.parkinson?.length || 0,
      },
    };
  });

  // ────────────────────────────────────────────
  // 15. GET /metrics — Engine performance metrics
  // ────────────────────────────────────────────
  app.get('/metrics', async () => {
    const allSessions = [...sessions.values()].flat();

    return {
      version: 'v5',
      uptime_seconds: Math.round((Date.now() - new Date(metrics.started_at).getTime()) / 1000),
      started_at: metrics.started_at,

      // Capacity
      patients_total: patients.size,
      patients_max: MAX_PATIENTS,
      sessions_total: allSessions.length,
      baselines_established: [...baselines.values()].filter(b => b?.complete).length,
      baselines_calibrating: [...baselines.values()].filter(b => b && !b.complete).length,

      // Patient breakdown by alert level
      patients_by_alert: {
        green: [...patients.values()].filter(p => (p.alert_level || 'green') === 'green').length,
        yellow: [...patients.values()].filter(p => p.alert_level === 'yellow').length,
        orange: [...patients.values()].filter(p => p.alert_level === 'orange').length,
        red: [...patients.values()].filter(p => p.alert_level === 'red').length,
      },

      // Processing throughput
      sessions_processed: metrics.sessions_processed,
      sessions_failed: metrics.sessions_failed,
      audio_extractions: metrics.audio_extractions,
      audio_failures: metrics.audio_failures,
      weekly_analyses: metrics.weekly_analyses,
      weekly_failures: metrics.weekly_failures,
      micro_tasks_processed: metrics.micro_tasks_processed,
      topic_detections: metrics.topic_detections,
      cross_validations: metrics.cross_validations,

      // Audio pipeline
      audio_sessions: allSessions.filter(s => s.has_audio).length,
      audio_rate: allSessions.length > 0
        ? allSessions.filter(s => s.has_audio).length / allSessions.length
        : 0,

      // Topic detection
      topic_sessions: allSessions.filter(s => s.topic_genre).length,
      topic_rate: allSessions.length > 0
        ? allSessions.filter(s => s.topic_genre).length / allSessions.length
        : 0,

      // Average execution times
      avg_text_extraction_ms: metrics.sessions_processed > 0
        ? Math.round(metrics.text_extraction_total_ms / metrics.sessions_processed) : 0,
      avg_audio_extraction_ms: metrics.audio_extractions > 0
        ? Math.round(metrics.audio_extraction_total_ms / metrics.audio_extractions) : 0,
      avg_analysis_ms: metrics.sessions_processed > 0
        ? Math.round(metrics.analysis_total_ms / metrics.sessions_processed) : 0,

      // Recent activity (last 50 processing events)
      recent_activity: metrics.last_processing_times,
    };
  });

  // ────────────────────────────────────────────
  // 16. POST /topic-detect — Detect topic genre from transcript (V5 NEW)
  // ────────────────────────────────────────────
  app.post('/topic-detect', {
    schema: {
      body: {
        type: 'object',
        required: ['transcript'],
        properties: {
          transcript: {
            type: 'array',
            items: {
              type: 'object',
              required: ['role', 'text'],
              properties: {
                role: { type: 'string', enum: ['patient', 'assistant'] },
                text: { type: 'string', minLength: 1, maxLength: 10000 },
              },
              additionalProperties: false,
            },
          },
          language: { type: 'string', default: 'fr', enum: ['fr', 'en'] },
        }
      }
    }
  }, async (request, reply) => {
    const { transcript, language } = request.body;
    const detectStart = performance.now();

    try {
      const result = detectTopicGenre(transcript);

      metrics.topic_detections++;
      const duration = performance.now() - detectStart;
      pushProcessingTime({ timestamp: new Date().toISOString(), duration_ms: Math.round(duration), type: 'topic_detect' });

      return {
        version: 'v5',
        genre: result?.genre || null,
        confidence: result?.confidence || 0,
        scores: result?.scores || {},
        keywords_matched: result?.keywords_matched || [],
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw err;
    }
  });

  // ────────────────────────────────────────────
  // 17. POST /cross-validate — Batch cross-validation (V5 NEW)
  // ────────────────────────────────────────────
  app.post('/cross-validate', {
    schema: {
      body: {
        type: 'object',
        required: ['patientId'],
        properties: {
          patientId: { type: 'string' },
          method: { type: 'string', enum: ['loo_cv', 'split_half', 'both'], default: 'loo_cv' },
          minBaseline: { type: 'number', minimum: 3, maximum: 20, default: 5 },
        }
      }
    }
  }, async (request, reply) => {
    const { patientId, method, minBaseline } = request.body;
    const cvStart = performance.now();
    const patientHash = crypto.createHash('sha256').update(patientId).digest('hex').slice(0, 8);

    const patient = getPatient(patientId);
    if (!patient) return reply.code(404).send({ error: 'Patient not found' });

    const allSessions = getPatientSessions(patientId);
    const v5Sessions = allSessions.filter(s => s.feature_vector);
    if (v5Sessions.length === 0) return reply.code(400).send({ error: 'No sessions available' });

    // Build topic genre map from stored session data
    const topicGenres = {};
    v5Sessions.forEach((s, i) => {
      if (s.topic_genre) topicGenres[i] = s.topic_genre;
    });

    const options = { minBaseline: minBaseline || 5, topicGenres };
    const results = {};
    const selectedMethod = method || 'loo_cv';

    if (selectedMethod === 'loo_cv' || selectedMethod === 'both') {
      results.loo_cv = batchAnalyzeWithCrossValidation(v5Sessions, options);
    }

    if (selectedMethod === 'split_half' || selectedMethod === 'both') {
      results.split_half = splitHalfCrossValidation(v5Sessions, options);
    }

    metrics.cross_validations++;
    const duration = performance.now() - cvStart;
    pushProcessingTime({ timestamp: new Date().toISOString(), duration_ms: Math.round(duration), type: 'cross_validate', patient_hash: patientHash });

    return {
      version: 'v5',
      patient_id: patientId,
      sessions_analyzed: v5Sessions.length,
      method: selectedMethod,
      timestamp: new Date().toISOString(),
      ...results,
    };
  });
}
