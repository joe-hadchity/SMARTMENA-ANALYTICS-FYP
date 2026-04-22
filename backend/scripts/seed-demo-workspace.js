#!/usr/bin/env node
/**
 * seed-demo-workspace.js
 *
 * Creates (or reuses) a demo workspace and fills it with MENA-flavoured
 * sample data. Useful for a fresh Supabase project, a new developer setup,
 * or screenshots.
 *
 * Usage:
 *   node scripts/seed-demo-workspace.js                      # uses demo slug
 *   node scripts/seed-demo-workspace.js <workspace-uuid>     # seeds that id
 *   node scripts/seed-demo-workspace.js --slug my-brand      # finds or creates
 *
 * Safe to run multiple times. Additive-only.
 */

const workspaceService = require("../src/services/workspaceService");
const { bootstrapDemoWorkspace } = require("../src/services/demoBootstrapService");
const logger = require("../src/utils/logger");

function parseArgs(argv) {
  const args = { id: null, slug: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--slug" || a === "-s") {
      args.slug = argv[i + 1];
      i += 1;
    } else if (/^[0-9a-f-]{36}$/i.test(a)) {
      args.id = a;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let workspace;
  if (args.id) {
    workspace = await workspaceService.getWorkspaceById(args.id);
  } else if (args.slug) {
    const existing = await workspaceService.findWorkspaceBySlug(args.slug);
    workspace =
      existing ||
      (await workspaceService.createWorkspace({
        name: args.slug.replace(/-+/g, " "),
        slug: args.slug,
        region_default: "AE",
        locale_default: "ar",
      }));
  } else {
    workspace = await workspaceService.getOrCreateDemoWorkspace();
  }

  logger.info(
    `Seeding workspace "${workspace.name}" (${workspace.id}, slug=${workspace.slug})…`,
  );

  const summary = await bootstrapDemoWorkspace(workspace.id);

  console.log(JSON.stringify(summary, null, 2));

  if (summary.warnings.length) {
    logger.warn(
      `Finished with ${summary.warnings.length} warning(s). Some optional tables may not be migrated yet.`,
    );
  } else {
    logger.info("Demo seed completed cleanly.");
  }

  process.exit(0);
}

main().catch((err) => {
  logger.error("seed-demo-workspace failed:", err);
  process.exit(1);
});
