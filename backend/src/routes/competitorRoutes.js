const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  createCompetitorSchema,
  updateCompetitorSchema,
  runDigestSchema,
} = require("../validators/competitorValidator");
const {
  list,
  getOne,
  create,
  update,
  remove,
  listPosts,
  refreshOne,
  refreshAll,
  latestDigest,
  listDigestRuns,
  generateDigest,
  previewAggregate,
} = require("../controllers/competitorController");

const router = express.Router();

router.use(workspaceContext());

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------
router.get("/", asyncHandler(list));
router.post("/", validate(createCompetitorSchema), asyncHandler(create));
router.post("/refresh-all", asyncHandler(refreshAll));

// ---------------------------------------------------------------------------
// Digest (mounted BEFORE /:id so the word "digest" doesn't look like a UUID)
// ---------------------------------------------------------------------------
router.get("/digest/latest", asyncHandler(latestDigest));
router.get("/digest/runs", asyncHandler(listDigestRuns));
router.get("/digest/preview", asyncHandler(previewAggregate));
router.post("/digest/generate", validate(runDigestSchema), asyncHandler(generateDigest));

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------
router.get("/:id", asyncHandler(getOne));
router.patch("/:id", validate(updateCompetitorSchema), asyncHandler(update));
router.delete("/:id", asyncHandler(remove));
router.get("/:id/posts", asyncHandler(listPosts));
router.post("/:id/refresh", asyncHandler(refreshOne));

module.exports = router;
