const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const env = require("./config/env");
const swaggerSpec = require("./config/swagger");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

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
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
