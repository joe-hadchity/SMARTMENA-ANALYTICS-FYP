/**
 * trendWorker -- scheduled background rebuild.
 *
 * Runs `trendAggregatorService.rebuildForWorkspace` for every workspace on an
 * interval. In production this would be a nightly cron; for the beta an
 * in-process `setInterval` is sufficient and mirrors `competitorDigestService`.
 *
 * Defaults:
 *   intervalMs  = 6h   (plenty for Layer 1 "discovery")
 *   windowDays  = 30
 *   allowLLM    = false  -- the daily tick stays keyword-only to cap cost.
 *                          Manual rebuilds via the API can opt-in to LLM.
 */

const aggregator = require("./trendAggregatorService");
const { getSupabase } = require("../../config/supabase");
const logger = require("../../utils/logger");

let workerInterval = null;

async function tick({ windowDays = 30, allowLLM = false } = {}) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, slug, name");
  if (error) {
    logger.warn?.(`[trendWorker] workspace list failed: ${error.message}`);
    return;
  }
  for (const ws of workspaces || []) {
    try {
      const summary = await aggregator.rebuildForWorkspace(ws.id, {
        windowDays,
        allowLLM,
      });
      logger.info?.(
        `[trendWorker] ws=${ws.slug} posts=${summary.post_count} terms=${summary.term_count} rows=${summary.snapshot_rows}`,
      );
    } catch (err) {
      logger.warn?.(
        `[trendWorker] workspace=${ws.slug} failed: ${err.message}`,
      );
    }
  }
}

function startTrendWorker({
  intervalMs = 6 * 60 * 60 * 1000,
  windowDays = 30,
  allowLLM = false,
} = {}) {
  if (workerInterval) return workerInterval;
  const run = () => {
    tick({ windowDays, allowLLM }).catch((err) =>
      logger.warn?.(`[trendWorker] tick error: ${err.message}`),
    );
  };
  workerInterval = setInterval(run, intervalMs);
  return workerInterval;
}

function stopTrendWorker() {
  if (workerInterval) clearInterval(workerInterval);
  workerInterval = null;
}

module.exports = {
  tick,
  startTrendWorker,
  stopTrendWorker,
};
