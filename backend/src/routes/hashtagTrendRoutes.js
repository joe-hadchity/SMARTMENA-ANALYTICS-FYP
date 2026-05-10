const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const workspaceContext = require("../middleware/workspaceContext");
const {
  listTrackedHashtags,
  searchHashtags,
  createTrackedHashtag,
  deleteTrackedHashtag,
  refreshTrackedHashtag,
  getTrackedHashtagSnapshots,
} = require("../controllers/hashtagTrendController");

const router = express.Router();

router.use(workspaceContext());

// GET /api/hashtags
router.get("/", asyncHandler(listTrackedHashtags));

// GET /api/hashtags/search?q=hikinglebanon
router.get("/search", asyncHandler(searchHashtags));

// POST /api/hashtags
router.post("/", asyncHandler(createTrackedHashtag));

// DELETE /api/hashtags/:id
router.delete("/:id", asyncHandler(deleteTrackedHashtag));

// POST /api/hashtags/:id/refresh
router.post("/:id/refresh", asyncHandler(refreshTrackedHashtag));

// GET /api/hashtags/:id/snapshots
router.get("/:id/snapshots", asyncHandler(getTrackedHashtagSnapshots));

module.exports = router;
