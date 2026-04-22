/**
 * Supabase client for the backend.
 *
 * SECURITY NOTE
 * -------------
 * This file intentionally uses the SUPABASE_SERVICE_ROLE_KEY, which:
 *   - bypasses Row-Level Security (RLS),
 *   - has full read/write access to every table,
 *   - MUST live only on the server (Node.js / Express),
 *   - MUST NEVER be shipped to the browser, a mobile app, or committed to git.
 *
 * The frontend (Next.js / mobile) should use the "anon" / publishable key
 * with its own Supabase client and rely on RLS policies. That is a separate
 * concern and is not configured here.
 */

const { createClient } = require("@supabase/supabase-js");
const env = require("./env");
const logger = require("../utils/logger");

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn(
      "Supabase env vars missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to enable persistence.",
    );
    return null;
  }

  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // Server-side client: no user sessions, no refresh, no cookie storage.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  logger.info("Supabase client initialized (service role).");
  return supabase;
}

module.exports = { getSupabase };
