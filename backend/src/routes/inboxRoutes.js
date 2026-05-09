const express = require("express");
const { z } = require("zod");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const inboxController = require("../controllers/inboxController");

const router = express.Router();

router.use(workspaceContext());

const listQuerySchema = z.object({
  type: z.enum(["all", "comment", "message"]).optional(),
  status: z.enum(["all", "unread", "read", "replied", "archived", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(300).optional(),
});

const syncBodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).optional();

const statusBodySchema = z.object({
  status: z.enum(["unread", "read", "replied", "archived"]),
});

const replyBodySchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

router.get("/", validate(listQuerySchema, "query"), asyncHandler(inboxController.list));
router.get("/summary", asyncHandler(inboxController.summary));
router.post("/sync", validate(syncBodySchema), asyncHandler(inboxController.sync));
router.patch("/:id/status", validate(statusBodySchema), asyncHandler(inboxController.markStatus));
router.post("/:id/reply", validate(replyBodySchema), asyncHandler(inboxController.reply));

module.exports = router;
