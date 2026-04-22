/**
 * Small reusable helpers around the Supabase client.
 *
 * Usage:
 *   const db = require("./dbService");
 *   const row = await db.insert("campaigns", { name: "X" });
 *   const rows = await db.list("campaigns", { filters: { country: "AE" } });
 *
 * Every helper throws a plain Error with `.status` set (400 or 404) so the
 * global errorHandler middleware can turn it into a clean JSON response.
 *
 * Uses the service role key from src/config/supabase.js. Do not import this
 * module from any frontend / browser context.
 */

const { getSupabase } = require("../config/supabase");

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.status = 503;
    throw err;
  }
  return supabase;
}

function wrapError(error, fallbackStatus = 400) {
  // Map common Postgres error codes to friendlier HTTP statuses.
  // Supabase returns the Postgres `code` under `error.code`.
  //   23503 -> foreign key violation
  //   23505 -> unique violation
  //   23514 -> check violation
  //   23502 -> not null violation
  let status = fallbackStatus;
  let message = error.message || "Database error";

  switch (error.code) {
    case "23503":
      status = 400;
      message = "Referenced record does not exist";
      break;
    case "23505":
      status = 409;
      message = "Record already exists";
      break;
    case "23514":
      status = 400;
      message = "Value violates a check constraint";
      break;
    case "23502":
      status = 400;
      message = "A required field is missing";
      break;
    default:
      break;
  }

  const err = new Error(message);
  err.status = status;
  err.details = { code: error.code, hint: error.hint, original: error.message };
  return err;
}

async function insert(table, payload) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select()
    .single();
  if (error) throw wrapError(error);
  return data;
}

async function insertMany(table, rows) {
  const supabase = requireClient();
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw wrapError(error);
  return data;
}

/**
 * List rows with optional filters / ordering / pagination.
 * options:
 *   filters: { column: value } - applies `.eq(column, value)` for each pair
 *   orderBy: "created_at"       - column name
 *   ascending: false            - default false (newest first)
 *   limit: 100
 *   select: "*"                 - columns to return
 */
async function list(table, options = {}) {
  const supabase = requireClient();
  let query = supabase.from(table).select(options.select || "*");

  if (options.filters) {
    for (const [col, val] of Object.entries(options.filters)) {
      query = query.eq(col, val);
    }
  }

  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? false });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw wrapError(error);
  return data || [];
}

async function getById(table, id, { select = "*" } = {}) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("id", id)
    .maybeSingle();
  if (error) throw wrapError(error);
  if (!data) {
    const err = new Error(`${table} ${id} not found`);
    err.status = 404;
    throw err;
  }
  return data;
}

async function update(table, id, payload) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw wrapError(error);
  return data;
}

async function remove(table, id) {
  const supabase = requireClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw wrapError(error);
  return { id, deleted: true };
}

module.exports = {
  getSupabase,
  insert,
  insertMany,
  list,
  getById,
  update,
  remove,
};
