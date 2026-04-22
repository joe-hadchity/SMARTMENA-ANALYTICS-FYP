const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  createWorkspaceSchema,
  updateBrandVoiceSchema,
} = require("../validators/workspaceValidator");
const {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  getCurrentWorkspace,
  listSocialAccountsForWorkspace,
  listSyncJobsForWorkspace,
  listInsightsForWorkspace,
  listRecommendationsForWorkspace,
  getBrandVoice,
  updateBrandVoice,
  demoBootstrap,
} = require("../controllers/workspaceController");
const {
  getWorkspaceDashboardSummary,
} = require("../controllers/dashboardController");
const {
  calendar: getCalendar,
} = require("../controllers/scheduledPostController");
const {
  listInsightsQuerySchema,
  listRecommendationsQuerySchema,
} = require("../validators/aiLayerValidator");

const router = express.Router();

// GET /api/workspaces
router.get("/", asyncHandler(listWorkspaces));

// GET /api/workspaces/current -- resolves via x-workspace-id header or demo fallback.
router.get("/current", workspaceContext(), asyncHandler(getCurrentWorkspace));

// POST /api/workspaces
router.post("/", validate(createWorkspaceSchema), asyncHandler(createWorkspace));

// GET /api/workspaces/:id
router.get("/:id", asyncHandler(getWorkspace));

// GET /api/workspaces/:id/social-accounts
router.get("/:id/social-accounts", asyncHandler(listSocialAccountsForWorkspace));

// GET /api/workspaces/:id/sync-jobs
router.get("/:id/sync-jobs", asyncHandler(listSyncJobsForWorkspace));

// GET /api/workspaces/:id/dashboard-summary
router.get(
  "/:id/dashboard-summary",
  asyncHandler(getWorkspaceDashboardSummary),
);

// GET /api/workspaces/:id/insights
router.get(
  "/:id/insights",
  validate(listInsightsQuerySchema, "query"),
  asyncHandler(listInsightsForWorkspace),
);

// GET /api/workspaces/:id/recommendations
router.get(
  "/:id/recommendations",
  validate(listRecommendationsQuerySchema, "query"),
  asyncHandler(listRecommendationsForWorkspace),
);

// GET  /api/workspaces/:id/brand-voice -- read brand voice + industry_hint + primary_region
router.get("/:id/brand-voice", asyncHandler(getBrandVoice));

// PATCH /api/workspaces/:id/brand-voice -- partial upsert
router.patch(
  "/:id/brand-voice",
  validate(updateBrandVoiceSchema),
  asyncHandler(updateBrandVoice),
);

// POST /api/workspaces/demo-bootstrap  -- resolve workspace from header/body
router.post(
  "/demo-bootstrap",
  workspaceContext(),
  asyncHandler(demoBootstrap),
);

// POST /api/workspaces/:id/demo-bootstrap  -- explicit target
router.post("/:id/demo-bootstrap", asyncHandler(demoBootstrap));

// GET /api/workspaces/current/calendar   -- header-resolved (must precede /:id)
router.get(
  "/current/calendar",
  workspaceContext(),
  asyncHandler(getCalendar),
);
// GET /api/workspaces/:id/calendar       -- explicit target
router.get("/:id/calendar", asyncHandler(getCalendar));

module.exports = router;
