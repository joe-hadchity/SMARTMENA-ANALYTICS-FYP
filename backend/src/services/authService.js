const { createClient } = require("@supabase/supabase-js");

const { getSupabase } = require("../config/supabase");
const env = require("../config/env");
const workspaceService = require("./workspaceService");
const demoBootstrapService = require("./demoBootstrapService");

const DEFAULT_BORN2HIKE_EMAIL = "born2hike@smartmena.local";
const DEFAULT_BORN2HIKE_PASSWORD = "Born2Hike2026!";
const DEFAULT_BORN2HIKE_NAME = "Born2Hike Demo User";
const MEMBERSHIP_TABLE =
  process.env.WORKSPACE_MEMBERSHIP_TABLE || "workspace_memberships";

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

function createPasswordAuthClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return requireClient();
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name:
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email ||
      "SmartMENA user",
  };
}

function sessionPayload(session) {
  if (!session) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    tokenType: session.token_type || "bearer",
  };
}

function extractBearerToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function getUserFromAccessToken(token) {
  if (!token) return null;
  const supabase = requireClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error("Invalid or expired session");
    err.status = 401;
    throw err;
  }
  return data.user;
}

async function membershipForWorkspace(userId, workspaceId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(MEMBERSHIP_TABLE)
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw wrapAuthDbError(error);
  return data || null;
}

async function listMemberships(userId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(MEMBERSHIP_TABLE)
    .select("role, workspace:workspaces(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw wrapAuthDbError(error);

  return (data || [])
    .filter((row) => row.workspace)
    .map((row) => ({
      role: row.role,
      workspace: row.workspace,
    }));
}

async function defaultMembership(userId) {
  const memberships = await listMemberships(userId);
  return memberships[0] || null;
}

async function login({ email, password }) {
  const supabase = createPasswordAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user || !data?.session) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const appUser = await ensurePublicUser(data.user);
  const memberships = await listMemberships(appUser.id);
  const activeMembership = memberships[0] || null;

  return {
    user: publicUser(data.user),
    session: sessionPayload(data.session),
    workspaces: memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    })),
    activeWorkspace: activeMembership?.workspace || null,
    activeRole: activeMembership?.role || null,
  };
}

async function register({
  name,
  email,
  password,
  workspaceName,
  region,
  locale,
  industry,
}) {
  const supabase = requireClient();
  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    const err = new Error("An account with this email already exists");
    err.status = 409;
    throw err;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw authAdminError(error);

  const appUser = await ensurePublicUser(data.user, { name, password });
  const workspace = await workspaceService.createWorkspaceForUser(
    {
      name: workspaceName || `${name}'s Workspace`,
      region_default: region || "LB",
      locale_default: locale || "en",
      industry: industry || "general",
    },
    appUser.id,
  );

  return login({ email, password }).then((payload) => ({
    ...payload,
    activeWorkspace: payload.activeWorkspace || workspace,
  }));
}

async function me(token) {
  const user = await getUserFromAccessToken(token);
  const appUser = await ensurePublicUser(user);
  const memberships = await listMemberships(appUser.id);
  const activeMembership = memberships[0] || null;

  return {
    user: publicUser(user),
    workspaces: memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    })),
    activeWorkspace: activeMembership?.workspace || null,
    activeRole: activeMembership?.role || null,
  };
}

async function bootstrapBorn2HikeUser(input = {}) {
  if (env.NODE_ENV === "production") {
    const err = new Error("Born2Hike auth bootstrap is disabled in production");
    err.status = 403;
    throw err;
  }

  const email =
    input.email ||
    process.env.BORN2HIKE_AUTH_EMAIL ||
    DEFAULT_BORN2HIKE_EMAIL;
  const password =
    input.password ||
    process.env.BORN2HIKE_AUTH_PASSWORD ||
    DEFAULT_BORN2HIKE_PASSWORD;
  const name =
    input.name ||
    process.env.BORN2HIKE_AUTH_NAME ||
    DEFAULT_BORN2HIKE_NAME;

  const supabase = requireClient();
  const user = await getOrCreateAuthUser(supabase, { email, password, name });
  const appUser = await ensurePublicUser(user, { name, password });
  const workspace = await workspaceService.getOrCreateBorn2HikeWorkspace({
    ownerUserId: appUser.id,
  });
  await ensureWorkspaceMembership({
    workspaceId: workspace.id,
    userId: appUser.id,
    role: "owner",
  });

  let bootstrap = null;
  const warnings = [];
  try {
    bootstrap = await demoBootstrapService.bootstrapDemoWorkspace(workspace.id);
  } catch (err) {
    warnings.push(
      err instanceof Error
        ? `demo_bootstrap_skipped:${err.message}`
        : "demo_bootstrap_skipped",
    );
  }

  return {
    email,
    password,
    user: publicUser({ ...user, id: appUser.id }),
    workspace,
    bootstrap,
    warnings,
  };
}

async function ensurePublicUser(authUser, { name, password } = {}) {
  const supabase = requireClient();
  const displayName =
    name ||
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    "SmartMENA user";

  const byId = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();
  if (byId.error) throw wrapPublicUserError(byId.error);
  if (byId.data) return byId.data;

  const byEmail = await supabase
    .from("users")
    .select("*")
    .eq("email", authUser.email)
    .maybeSingle();
  if (byEmail.error) throw wrapPublicUserError(byEmail.error);
  if (byEmail.data) return byEmail.data;

  const { data, error } = await supabase
    .from("users")
    .insert({
      id: authUser.id,
      name: displayName,
      email: authUser.email,
      password_hash: password ? "managed-by-supabase-auth" : null,
    })
    .select()
    .single();

  if (error) throw wrapPublicUserError(error);
  return data;
}

async function getOrCreateAuthUser(supabase, { email, password, name }) {
  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existing.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata || {}),
          name,
          demo: "born2hike",
        },
      },
    );
    if (error) throw authAdminError(error);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      demo: "born2hike",
    },
  });
  if (error) throw authAdminError(error);
  return data.user;
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw authAdminError(error);
    const found = (data?.users || []).find(
      (user) => String(user.email || "").toLowerCase() === email.toLowerCase(),
    );
    if (found) return found;
    if (!data?.users?.length || data.users.length < 100) break;
    page += 1;
  }
  return null;
}

async function ensureWorkspaceMembership({ workspaceId, userId, role }) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(MEMBERSHIP_TABLE)
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        role,
        status: "active",
      },
      { onConflict: "workspace_id,user_id" },
    )
    .select()
    .single();

  if (error) throw wrapAuthDbError(error);
  return data;
}

function authAdminError(error) {
  const err = new Error(error.message || "Supabase Auth admin error");
  err.status = 400;
  err.details = error;
  return err;
}

function wrapAuthDbError(error) {
  const missingMembershipTable =
    (error.code === "42P01" || error.code === "PGRST205") &&
    /workspace_memberships?|workspace_members/i.test(error.message || "");
  const err = new Error(
    missingMembershipTable
      ? "Authentication membership schema is not installed. Apply the auth/workspace membership migration first."
      : error.message || "Authentication database error",
  );
  err.status = missingMembershipTable ? 503 : 400;
  err.details = { code: error.code, hint: error.hint, original: error.message };
  return err;
}

function wrapPublicUserError(error) {
  const err = new Error(error.message || "Failed to sync auth user");
  err.status = 400;
  err.details = { code: error.code, hint: error.hint, original: error.message };
  return err;
}

module.exports = {
  DEFAULT_BORN2HIKE_EMAIL,
  DEFAULT_BORN2HIKE_PASSWORD,
  bootstrapBorn2HikeUser,
  defaultMembership,
  extractBearerToken,
  ensurePublicUser,
  getUserFromAccessToken,
  login,
  me,
  register,
  membershipForWorkspace,
  publicUser,
};
