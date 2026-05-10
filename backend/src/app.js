const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const env = require("./config/env");
const swaggerSpec = require("./config/swagger");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const workspaceContext = require("./middleware/workspaceContext");

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Interactive API docs. Mounted before /api so notFound doesn't catch it.
//   GET /api/docs       -- Swagger UI
//   GET /api/docs.json  -- raw OpenAPI spec
app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "SmartMENA Analytics API",
    swaggerOptions: {},
  }),
);

/**
 * Paths that bypass workspace context.
 *
 *   /api/health           - readiness probe
 *   /api/auth/*           - login/session/bootstrap endpoints
 *   /api/oauth/meta/*     - Meta connection status/callback
 *   /api/webhooks/*       - Meta webhook verification/events
 *   /api/reports/shared/* - token-based public report read
 */
const PUBLIC_PATTERNS = [
  /^\/api\/health(?:\/|$)/,
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/oauth\/meta\/(?:status|callback)(?:\/|$)/,
  /^\/api\/webhooks(?:\/|$)/,
  /^\/api\/reports\/shared\//,
];

function isPublic(path) {
  return PUBLIC_PATTERNS.some((rx) => rx.test(path));
}

/**
 * Apply workspace context to every /api/* path that is not public.
 */
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  if (isPublic(req.path)) return next();
  return workspaceContext()(req, res, next);
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
