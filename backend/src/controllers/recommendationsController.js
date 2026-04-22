const recommendationsService = require("../services/recommendationsService");

async function getMenaRecommendation(req, res) {
  const rec = await recommendationsService.getMenaRecommendation(req.body);
  res.json(rec);
}

module.exports = { getMenaRecommendation };
