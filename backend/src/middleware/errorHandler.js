const logger = require("../utils/logger");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (status >= 500) {
    logger.error(message, err.stack || "");
  }

  res.status(status).json({
    message,
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = errorHandler;
