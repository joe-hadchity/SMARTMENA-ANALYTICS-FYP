const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  createScheduledPostSchema,
  updateScheduledPostSchema,
} = require("../validators/scheduledPostValidator");
const {
  list,
  getOne,
  create,
  update,
  cancel,
  remove,
  publishNow,
} = require("../controllers/scheduledPostController");

const router = express.Router();

router.use(workspaceContext());

// GET    /api/scheduled-posts
// GET    /api/scheduled-posts/:id
// POST   /api/scheduled-posts
// PATCH  /api/scheduled-posts/:id
// POST   /api/scheduled-posts/:id/cancel
// DELETE /api/scheduled-posts/:id
// POST   /api/scheduled-posts/publish-now  (manual trigger, used by tests)

router.get("/", asyncHandler(list));
router.get("/:id", asyncHandler(getOne));
router.post("/", validate(createScheduledPostSchema), asyncHandler(create));
router.patch("/:id", validate(updateScheduledPostSchema), asyncHandler(update));
router.post("/:id/cancel", asyncHandler(cancel));
router.delete("/:id", asyncHandler(remove));
router.post("/publish-now", asyncHandler(publishNow));

module.exports = router;
