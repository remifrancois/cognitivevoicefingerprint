/**
 * V5 CROSS-VALIDATION
 *
 * Fixes the self-referential baseline problem discovered in the Profile01 analysis.
 * When all sessions are from the same patient during the calibration period,
 * standard baseline computation uses each session against itself, producing
 * a 0.000 composite (perfect self-match) that masks genuine cognitive variation.
 *
 * This module provides two cross-validation strategies:
 *
 * Leave-One-Out CV (LOO-CV):
 *   For each session i, compute the baseline from all sessions EXCEPT session i,
 *   then analyze the held-out session i against that baseline. This ensures no
 *   session ever appears in its own reference distribution. N analyses are produced
 *   from N sessions, each with an independent baseline.
 *
 * Split-Half CV:
 *   Divide sessions into odd-indexed and even-indexed halves. Compute a baseline
 *   from each half, then analyze the opposite half against it. This produces a
 *   reliability estimate (Spearman-Brown corrected) alongside the scores.
 *
 * Both methods feed into aggregateCrossValidatedResults() which computes summary
 * statistics, detects outlier sessions, and provides a consistency metric.
 *
 * @module v5/cross-validation
 */

import {
  computeV5Baseline,
  computeZScores,
  computeDomainScores,
  computeComposite,
  getAlertLevel,
  detectCascade,
  checkSentinels,
  analyzeSession,
} from './algorithm.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Analyze a set of sessions against a pre-computed baseline.
 *
 * Used internally by splitHalfCrossValidation to evaluate one half of the
 * session pool against the baseline derived from the other half.
 *
 * @param {Array<Object>} sessions - Sessions to analyze. Each must have a
 *   `feature_vector` property and optionally `session_id` and `confounders`.
 * @param {Object} baseline - Pre-computed V5 baseline object (from computeV5Baseline).
 * @param {Object} topicGenres - Map of original session index to topic genre string.
 * @param {string} label - Descriptive label for this analysis pass
 *   (e.g. 'even_on_odd_baseline').
 * @returns {Array<Object>} Array of per-session result objects.
 */
function analyzeHalf(sessions, baseline, topicGenres, label) {
  const results = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const originalIndex = session._originalIndex != null ? session._originalIndex : i;
    const topicGenre = topicGenres[originalIndex] || null;

    if (!baseline.complete) {
      results.push({
        session_index: originalIndex,
        session_id: session.session_id || `session_${originalIndex}`,
        status: 'insufficient_baseline',
        composite: null,
        label,
      });
      continue;
    }

    const analysis = analyzeSession(
      session.feature_vector,
      baseline,
      session.confounders || {},
      [], // no longitudinal history within a split-half pass
      topicGenre,
    );

    results.push({
      session_index: originalIndex,
      session_id: session.session_id || `session_${originalIndex}`,
      status: 'analyzed',
      composite: analysis.composite,
      alert_level: analysis.alert_level,
      domain_scores: analysis.domain_scores,
      z_scores: analysis.z_scores,
      sentinel_alerts: analysis.sentinel_alerts,
      cascade: analysis.cascade,
      topic_genre: topicGenre,
      label,
    });
  }

  return results;
}

/**
 * Compute Spearman-Brown corrected split-half reliability.
 *
 * Takes the two sets of per-session results (odd half analyzed on even baseline
 * and vice-versa), pairs them by session order, and computes the Pearson
 * correlation between the two sets of composite scores. The raw correlation is
 * then corrected with the Spearman-Brown prophecy formula:
 *
 *   reliability = (2 * r) / (1 + r)
 *
 * This estimates the reliability of the full-length instrument from the
 * half-length correlation.
 *
 * @param {Array<Object>} oddResults - Results from analyzing even sessions on
 *   the odd-derived baseline.
 * @param {Array<Object>} evenResults - Results from analyzing odd sessions on
 *   the even-derived baseline.
 * @returns {Object} Reliability metrics including raw correlation, corrected
 *   reliability, and the number of pairs used.
 */
function computeSplitHalfReliability(oddResults, evenResults) {
  // Extract composites from analyzed sessions only
  const oddComposites = oddResults
    .filter(r => r.status === 'analyzed' && r.composite != null)
    .map(r => r.composite);
  const evenComposites = evenResults
    .filter(r => r.status === 'analyzed' && r.composite != null)
    .map(r => r.composite);

  // Need at least 3 pairs for a meaningful correlation
  const pairCount = Math.min(oddComposites.length, evenComposites.length);
  if (pairCount < 3) {
    return {
      raw_correlation: null,
      spearman_brown: null,
      pairs_used: pairCount,
      note: 'Insufficient pairs for reliability estimation (need >= 3)',
    };
  }

  // Use the first pairCount values from each (they are ordered by session)
  const x = oddComposites.slice(0, pairCount);
  const y = evenComposites.slice(0, pairCount);

  const r = pearsonCorrelation(x, y);

  // Spearman-Brown prophecy formula for split-half correction
  // Handles edge case where r = -1 (denominator = 0)
  const spearmanBrown = (1 + r) !== 0
    ? (2 * r) / (1 + r)
    : -1;

  return {
    raw_correlation: Math.round(r * 1000) / 1000,
    spearman_brown: Math.round(spearmanBrown * 1000) / 1000,
    pairs_used: pairCount,
  };
}

/**
 * Compute the Pearson product-moment correlation coefficient between two arrays.
 *
 * @param {number[]} x - First array of values.
 * @param {number[]} y - Second array of values (same length as x).
 * @returns {number} Pearson r in the range [-1, 1], or 0 if variance is zero.
 */
function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);
  if (denominator === 0) return 0;

  return sumXY / denominator;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Perform leave-one-out cross-validated batch analysis.
 *
 * For N sessions, this performs N analyses. In each iteration i, the baseline
 * is computed from all sessions except session i, and session i is analyzed
 * against that baseline. This eliminates the self-referential problem where
 * a session's own data inflates the baseline it is compared against.
 *
 * @param {Array<Object>} sessions - Array of session objects. Each must contain:
 *   - `feature_vector` {Object} - The feature vector for that session.
 *   - `session_id` {string} [optional] - Unique identifier for the session.
 *   - `confounders` {Object} [optional] - Confounder data (medications, sleep, etc.).
 * @param {Object} [options={}] - Configuration options.
 * @param {number} [options.minBaseline=5] - Minimum number of sessions required
 *   in the training set for baseline computation. If total sessions < minBaseline,
 *   the function returns an error result.
 * @param {Object} [options.topicGenres={}] - Map of session index to topic genre
 *   string for topic-adjusted analysis.
 * @returns {Object} Cross-validation result object containing:
 *   - `method` {'loo_cv'} - Identifies this as leave-one-out CV.
 *   - `total_sessions` {number} - Total input session count.
 *   - `analyzed` {number} - Number of sessions successfully analyzed.
 *   - `results` {Array<Object>} - Per-session analysis results.
 *   - `aggregate` {Object} - Aggregated statistics from aggregateCrossValidatedResults.
 *   - `error` {string} [conditional] - Present only if sessions < minBaseline.
 */
export function batchAnalyzeWithCrossValidation(sessions, options = {}) {
  const { minBaseline = 5, topicGenres = {} } = options;

  if (sessions.length < minBaseline) {
    return {
      method: 'loo_cv',
      error: `Insufficient sessions (${sessions.length} < ${minBaseline} minimum)`,
      results: [],
    };
  }

  const results = [];

  for (let i = 0; i < sessions.length; i++) {
    // Build baseline from ALL sessions EXCEPT session i
    const trainingVectors = sessions
      .filter((_, idx) => idx !== i)
      .map(s => s.feature_vector);

    const baseline = computeV5Baseline(
      trainingVectors,
      Math.min(minBaseline, trainingVectors.length),
    );

    if (!baseline.complete) {
      results.push({
        session_index: i,
        session_id: sessions[i].session_id || `session_${i}`,
        status: 'insufficient_baseline',
        composite: null,
      });
      continue;
    }

    // Analyze the held-out session against the LOO baseline
    const topicGenre = topicGenres[i] || null;
    const analysis = analyzeSession(
      sessions[i].feature_vector,
      baseline,
      sessions[i].confounders || {},
      [], // no longitudinal history for LOO
      topicGenre,
    );

    results.push({
      session_index: i,
      session_id: sessions[i].session_id || `session_${i}`,
      status: 'analyzed',
      composite: analysis.composite,
      alert_level: analysis.alert_level,
      domain_scores: analysis.domain_scores,
      z_scores: analysis.z_scores,
      sentinel_alerts: analysis.sentinel_alerts,
      cascade: analysis.cascade,
      topic_genre: topicGenre,
    });
  }

  return {
    method: 'loo_cv',
    total_sessions: sessions.length,
    analyzed: results.filter(r => r.status === 'analyzed').length,
    results,
    aggregate: aggregateCrossValidatedResults(results),
  };
}

/**
 * Perform split-half cross-validation with Spearman-Brown reliability.
 *
 * Sessions are divided into two halves by index parity:
 *   - Odd half:  sessions at indices 1, 3, 5, ...
 *   - Even half: sessions at indices 0, 2, 4, ...
 *
 * A baseline is computed from each half, and the opposite half is analyzed
 * against it. This provides an estimate of internal consistency (reliability)
 * via the Spearman-Brown corrected split-half correlation.
 *
 * Requires at least minBaseline * 2 sessions so that each half has enough
 * data for a valid baseline.
 *
 * @param {Array<Object>} sessions - Array of session objects (same format as
 *   batchAnalyzeWithCrossValidation).
 * @param {Object} [options={}] - Configuration options.
 * @param {number} [options.minBaseline=5] - Minimum sessions per half for
 *   baseline computation. Total sessions must be >= minBaseline * 2.
 * @param {Object} [options.topicGenres={}] - Map of session index to topic genre.
 * @returns {Object} Split-half result object containing:
 *   - `method` {'split_half'} - Identifies this as split-half CV.
 *   - `total_sessions` {number} - Total input session count.
 *   - `odd_count` {number} - Number of odd-indexed sessions.
 *   - `even_count` {number} - Number of even-indexed sessions.
 *   - `results` {Object} - Contains `odd` and `even` arrays of per-session results.
 *   - `aggregate` {Object} - Aggregated statistics across all results.
 *   - `reliability` {Object} - Split-half reliability with Spearman-Brown correction.
 *   - `error` {string} [conditional] - Present only if insufficient sessions.
 */
export function splitHalfCrossValidation(sessions, options = {}) {
  const { minBaseline = 5, topicGenres = {} } = options;

  if (sessions.length < minBaseline * 2) {
    return {
      method: 'split_half',
      error: `Insufficient sessions for split-half (${sessions.length} < ${minBaseline * 2})`,
      results: { odd: [], even: [] },
    };
  }

  // Split into odd-indexed and even-indexed sessions, preserving original indices
  const oddSessions = sessions
    .filter((_, i) => i % 2 === 1)
    .map((s, _, arr) => s); // keep reference
  const evenSessions = sessions
    .filter((_, i) => i % 2 === 0);

  // Tag sessions with their original indices for result tracking
  const taggedOddSessions = sessions
    .map((s, i) => ({ ...s, _originalIndex: i }))
    .filter((_, i) => i % 2 === 1);
  const taggedEvenSessions = sessions
    .map((s, i) => ({ ...s, _originalIndex: i }))
    .filter((_, i) => i % 2 === 0);

  // Compute baselines from each half
  const oddBaseline = computeV5Baseline(
    oddSessions.map(s => s.feature_vector),
    Math.min(minBaseline, oddSessions.length),
  );
  const evenBaseline = computeV5Baseline(
    evenSessions.map(s => s.feature_vector),
    Math.min(minBaseline, evenSessions.length),
  );

  // Analyze each half against the OPPOSITE baseline
  // Even sessions analyzed on the odd-derived baseline
  const oddResults = analyzeHalf(
    taggedEvenSessions,
    oddBaseline,
    topicGenres,
    'even_on_odd_baseline',
  );
  // Odd sessions analyzed on the even-derived baseline
  const evenResults = analyzeHalf(
    taggedOddSessions,
    evenBaseline,
    topicGenres,
    'odd_on_even_baseline',
  );

  const allResults = [...oddResults, ...evenResults];

  return {
    method: 'split_half',
    total_sessions: sessions.length,
    odd_count: oddSessions.length,
    even_count: evenSessions.length,
    results: { odd: oddResults, even: evenResults },
    aggregate: aggregateCrossValidatedResults(allResults),
    // Split-half reliability: correlation between the two halves' composites
    reliability: computeSplitHalfReliability(oddResults, evenResults),
  };
}

/**
 * Aggregate cross-validated per-session results into summary statistics.
 *
 * Computes mean and standard deviation of composite scores, per-domain mean
 * scores, identifies outlier sessions (> 2 SD from mean), and produces a
 * consistency metric indicating how stable scores are across cross-validation
 * folds.
 *
 * @param {Array<Object>} results - Array of per-session result objects, each
 *   containing at minimum:
 *   - `status` {string} - 'analyzed' for valid results.
 *   - `composite` {number|null} - Composite score for the session.
 *   - `domain_scores` {Object} [optional] - Per-domain scores.
 *   - `session_index` {number} - Original index of the session.
 *   - `session_id` {string} - Session identifier.
 *   - `topic_genre` {string|null} [optional] - Topic genre if applicable.
 * @returns {Object} Aggregated result containing:
 *   - `mean_composite` {number|null} - Mean composite across analyzed sessions.
 *   - `std_composite` {number|null} - Standard deviation of composite scores.
 *   - `alert_level` {string} - Alert level based on the mean composite.
 *   - `domain_means` {Object} - Mean score for each cognitive domain.
 *   - `outlier_sessions` {Array<Object>} - Sessions with |deviation| > 2 * std.
 *   - `consistency` {number|null} - Stability metric in [0, 1] where 1 = perfectly
 *     consistent scores across folds.
 *   - `sessions_analyzed` {number} - Count of sessions included in aggregation.
 */
export function aggregateCrossValidatedResults(results) {
  const analyzed = results.filter(
    r => r.status === 'analyzed' && r.composite != null,
  );

  if (analyzed.length === 0) {
    return {
      mean_composite: null,
      std_composite: null,
      alert_level: 'unknown',
      domain_means: {},
      outlier_sessions: [],
      consistency: null,
      sessions_analyzed: 0,
    };
  }

  // --- Composite statistics ---
  const composites = analyzed.map(r => r.composite);
  const mean = composites.reduce((a, b) => a + b, 0) / composites.length;
  const std = Math.sqrt(
    composites.reduce((a, b) => a + (b - mean) ** 2, 0) / composites.length,
  );

  // --- Per-domain means ---
  const domainMeans = {};
  const allDomains = new Set();
  for (const r of analyzed) {
    if (r.domain_scores) {
      for (const d of Object.keys(r.domain_scores)) {
        allDomains.add(d);
      }
    }
  }
  for (const domain of allDomains) {
    const vals = analyzed
      .map(r => r.domain_scores?.[domain])
      .filter(v => v != null);
    domainMeans[domain] =
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  // --- Detect outlier sessions (|composite - mean| > 2 * std) ---
  const outlierSessions = analyzed
    .filter(r => std > 0 && Math.abs(r.composite - mean) > 2 * std)
    .map(r => ({
      session_index: r.session_index,
      session_id: r.session_id,
      composite: r.composite,
      deviation: Math.round((r.composite - mean) * 1000) / 1000,
      topic_genre: r.topic_genre,
    }));

  // --- Consistency metric ---
  // 1 - (coefficient of variation), clamped to [0, 1].
  // A consistency of 1.0 means all CV folds produced identical composites.
  // A consistency near 0.0 means scores vary wildly across folds.
  const consistency =
    mean !== 0 ? Math.max(0, Math.min(1, 1 - std / Math.abs(mean))) : 0;

  return {
    mean_composite: Math.round(mean * 1000) / 1000,
    std_composite: Math.round(std * 1000) / 1000,
    alert_level: getAlertLevel(mean),
    domain_means: Object.fromEntries(
      Object.entries(domainMeans).map(([k, v]) => [
        k,
        v != null ? Math.round(v * 1000) / 1000 : null,
      ]),
    ),
    outlier_sessions: outlierSessions,
    consistency: Math.round(consistency * 1000) / 1000,
    sessions_analyzed: analyzed.length,
  };
}
