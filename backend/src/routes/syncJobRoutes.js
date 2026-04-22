const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const { createSyncJobSchema } = require("../validators/syncJobValidator");
const {
  listSyncJobs,
  getSyncJob,
  createSyncJob,
} = require("../controllers/syncJobController");

const router = express.Router();

router.use(workspaceContext());

// GET /api/sync-jobs -- filter by platform / status / accountId / limit.
router.get("/", asyncHandler(listSyncJobs));

// POST /api/sync-jobs
router.post("/", validate(createSyncJobSchema), asyncHandler(createSyncJob));

// GET /api/sync-jobs/:id
router.get("/:id", asyncHandler(getSyncJob));

module.exports = router;
