const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const AZURE_ENDPOINT = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY || "";
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "";
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 4000,
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://localhost:8000",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  // NOTE: service_role key. Server-side only. NEVER expose to the browser.
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  // ---------------------------------------------------------------------
  // Azure OpenAI (optional). Missing values disable the AI layer but keep
  // the app running for developers without credentials.
  // ---------------------------------------------------------------------
  AZURE_OPENAI_ENDPOINT: AZURE_ENDPOINT,
  AZURE_OPENAI_API_KEY: AZURE_KEY,
  AZURE_OPENAI_DEPLOYMENT: AZURE_DEPLOYMENT,
  AZURE_OPENAI_API_VERSION: AZURE_API_VERSION,
  AZURE_OPENAI_ENABLED: Boolean(AZURE_ENDPOINT && AZURE_KEY && AZURE_DEPLOYMENT),

  // Per-workspace monthly soft cap on total tokens (prompt + completion).
  LLM_MONTHLY_TOKEN_BUDGET: Number(process.env.LLM_MONTHLY_TOKEN_BUDGET) || 100000,

  // ---------------------------------------------------------------------
  // Meta Graph API OAuth (Phase 5).
  //
  // When all three Meta values + TOKEN_ENCRYPTION_KEY are set the /api/oauth/meta
  // flow switches from mock to live Graph v19. Until then, connecting a Meta
  // account keeps running through the mock provider and new social_accounts
  // rows stay `is_mock=true`.
  // ---------------------------------------------------------------------
  META_APP_ID: process.env.META_APP_ID || "",
  META_APP_SECRET: process.env.META_APP_SECRET || "",
  META_REDIRECT_URI:
    process.env.META_REDIRECT_URI ||
    `http://localhost:${Number(process.env.PORT) || 4000}/api/oauth/meta/callback`,
  META_GRAPH_VERSION: process.env.META_GRAPH_VERSION || "v22.0",
  META_OAUTH_ENABLED: Boolean(
    process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      process.env.TOKEN_ENCRYPTION_KEY,
  ),

  // pgp_sym_encrypt / pgp_sym_decrypt secret used for oauth_connections.
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY || "",

  // Where Meta should send the user back to in the SPA after OAuth finishes.
  // The callback will 302 to `${FRONTEND_URL}${redirect_after}`.
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
};

module.exports = env;
