const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  listTrendsQuery,
  trendDetailQuery,
  rebuildBody,
} = require("../validators/trendValidator");
const {
  listTrends,
  getDetail,
  rebuild,
} = require("../controllers/trendsController");

const router = express.Router();

router.use(workspaceContext());

router.get("/", validate(listTrendsQuery, "query"), asyncHandler(listTrends));
router.post("/rebuild", validate(rebuildBody), asyncHandler(rebuild));
router.get(
  "/:id",
  validate(trendDetailQuery, "query"),
  asyncHandler(getDetail),
);

module.exports = router;
