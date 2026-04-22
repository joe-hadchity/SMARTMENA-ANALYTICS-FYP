const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const workspaceContext = require("../middleware/workspaceContext");
const {
  getGrowthReport,
  createShare,
  listShares,
  revokeShare,
  getSharedReport,
} = require("../controllers/reportController");

const router = express.Router();

// Public (no workspace context): shared link read.
router.get("/shared/:token", asyncHandler(getSharedReport));

// Authenticated / workspace-scoped routes.
router.use(workspaceContext());

// GET  /api/reports/growth           -- current workspace
router.get("/growth", asyncHandler(getGrowthReport));
// GET  /api/reports/growth/:id       -- explicit workspace
router.get("/growth/:id", asyncHandler(getGrowthReport));

// POST /api/reports/growth/share     -- generate share link for current workspace
router.post("/growth/share", asyncHandler(createShare));
router.post("/growth/:id/share", asyncHandler(createShare));

// GET  /api/reports/shares           -- list existing shares
router.get("/shares", asyncHandler(listShares));
router.get("/shares/:id", asyncHandler(listShares));

// DELETE /api/reports/shares/:shareId
router.delete("/shares/:shareId", asyncHandler(revokeShare));

module.exports = router;
