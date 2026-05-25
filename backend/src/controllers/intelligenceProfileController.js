const intelligenceProfileService = require("../services/intelligenceProfileService");

async function getIntelligenceProfile(req, res) {
  const workspaceId = req.params.workspaceId || req.params.id;
  const profile = await intelligenceProfileService.getIntelligenceProfile(
    workspaceId,
  );
  res.json(profile);
}

module.exports = {
  getIntelligenceProfile,
};
