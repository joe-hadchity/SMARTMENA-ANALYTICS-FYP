const roiService = require("../services/roiService");

async function predictRoi(req, res) {
  const result = await roiService.predictRoi(req.body || {});
  res.status(200).json(result);
}

module.exports = { predictRoi };
