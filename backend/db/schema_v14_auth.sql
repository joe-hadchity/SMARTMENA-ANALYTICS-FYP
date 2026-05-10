-- =============================================================================
-- schema_v14_auth.sql
-- =============================================================================
-- Adds the user/workspace-membership layer that backs real authentication.
--
--   • workspace_members  — many-to-many between Supabase auth.users and
--                          workspaces, with a role per pairing.
--   • workspaces.owner_user_id  — primary owner of the workspace
--                                 (also the implicit billing/admin contact).
--
-- This migration is additive: existing workspaces continue to work. The
-- demo workspace remains accessible without authentication for legacy
-- demo flows, but every other workspace now requires membership.
--
-- Apply with:  psql "$SUPABASE_URL" -f backend/db/schema_v14_auth.sql
-- =============================================================================

-- ---- workspaces.owner_user_id ----------------------------------------------
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ---- workspace_members -----------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
                DEFAULT 'member',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace
  ON workspace_members(workspace_id);
