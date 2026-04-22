const sentimentService = require("../services/sentimentService");

async function analyzeSentiment(req, res) {
  const result = await sentimentService.analyzeSentiment(req.body || {});
  res.status(200).json(result);
}

module.exports = { analyzeSentiment };
