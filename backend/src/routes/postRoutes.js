const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const { createPostSchema } = require("../validators/postValidator");
const { createPost } = require("../controllers/postController");

const router = express.Router();

router.use(workspaceContext());

router.post("/", validate(createPostSchema), asyncHandler(createPost));

module.exports = router;
