const hashtagTrendService = require("./hashtagTrendService");
const logger = require("../../utils/logger");

let workerInterval = null;

function startHashtagTrendWorker({ intervalMs = 6 * 60 * 60 * 1000 } = {}) {
  if (workerInterval) return workerInterval;

  const tick = async () => {
    try {
      const summary = await hashtagTrendService.refreshDueHashtags({ limit: 3 });
      if (summary.checked) {
        logger.info(
          `hashtagTrendWorker: checked=${summary.checked} refreshed=${summary.refreshed}`,
        );
      }
    } catch (err) {
      logger.warn(`hashtagTrendWorker error: ${err.message}`);
    }
  };

  workerInterval = setInterval(tick, intervalMs);
  setTimeout(tick, 30_000);
  return workerInterval;
}

function stopHashtagTrendWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

module.exports = {
  startHashtagTrendWorker,
  stopHashtagTrendWorker,
};
