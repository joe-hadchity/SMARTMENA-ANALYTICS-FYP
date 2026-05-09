const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const controller = require("../controllers/competitorController");
const {
  comparisonQuerySchema,
  discoverCompetitorsSchema,
  listCandidatesQuerySchema,
  listCompetitorsQuerySchema,
  manualCompetitorSchema,
} = require("../validators/competitorValidator");

const router = express.Router();

router.use(workspaceContext());

router.get(
  "/",
  validate(listCompetitorsQuerySchema, "query"),
  asyncHandler(controller.listCompetitors),
);

router.post(
  "/",
  validate(manualCompetitorSchema),
  asyncHandler(controller.manualAddCompetitor),
);

router.get("/summary", asyncHandler(controller.summary));

router.get(
  "/comparison",
  validate(comparisonQuerySchema, "query"),
  asyncHandler(controller.comparison),
);

router.post(
  "/discover",
  validate(discoverCompetitorsSchema),
  asyncHandler(controller.discoverCompetitors),
);

router.get(
  "/candidates",
  validate(listCandidatesQuerySchema, "query"),
  asyncHandler(controller.listCandidates),
);

router.post("/candidates/:id/approve", asyncHandler(controller.approveCandidate));
router.post("/candidates/:id/reject", asyncHandler(controller.rejectCandidate));
router.post("/refresh-all", asyncHandler(controller.refreshAllCompetitors));
router.post("/:id/refresh", asyncHandler(controller.refreshCompetitor));
router.delete("/:id", asyncHandler(controller.removeCompetitor));

module.exports = router;
