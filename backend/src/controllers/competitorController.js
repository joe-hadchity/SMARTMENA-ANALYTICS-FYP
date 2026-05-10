const competitorService = require("../services/competitors/competitorService");

async function listCompetitors(req, res) {
  const rows = await competitorService.listApproved(req.workspaceId, req.query);
  res.json(rows);
}

async function listCandidates(req, res) {
  const rows = await competitorService.listCandidates(req.workspaceId, req.query);
  res.json(rows);
}

async function discoverCompetitors(req, res) {
  const result = await competitorService.discover(req.workspaceId, req.body);
  res.json(result);
}

async function manualAddCompetitor(req, res) {
  const result = await competitorService.manualAdd(req.workspaceId, req.body);
  res.status(201).json(result);
}

async function approveCandidate(req, res) {
  const result = await competitorService.approveCandidate(req.workspaceId, req.params.id);
  res.json(result);
}

async function rejectCandidate(req, res) {
  const result = await competitorService.rejectCandidate(req.workspaceId, req.params.id);
  res.json(result);
}

async function removeCompetitor(req, res) {
  const result = await competitorService.removeCompetitor(req.workspaceId, req.params.id);
  res.json(result);
}

async function refreshCompetitor(req, res) {
  const result = await competitorService.refreshCompetitor(req.workspaceId, req.params.id);
  res.json(result);
}

async function refreshAllCompetitors(req, res) {
  const result = await competitorService.refreshAllCompetitors(req.workspaceId);
  res.json(result);
}

async function summary(req, res) {
  const result = await competitorService.summary(req.workspaceId);
  res.json(result);
}

async function comparison(req, res) {
  const result = await competitorService.comparison(req.workspaceId, req.query);
  res.json(result);
}

module.exports = {
  approveCandidate,
  comparison,
  discoverCompetitors,
  listCandidates,
  listCompetitors,
  manualAddCompetitor,
  refreshAllCompetitors,
  refreshCompetitor,
  rejectCandidate,
  removeCompetitor,
  summary,
};
