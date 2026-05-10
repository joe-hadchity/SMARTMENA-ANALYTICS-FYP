const authService = require("../src/services/authService");

async function main() {
  const result = await authService.bootstrapBorn2HikeUser();
  console.log("Born2Hike auth user ready");
  console.log(`email: ${result.email}`);
  console.log(`password: ${result.password}`);
  console.log(`workspace: ${result.workspace.name} (${result.workspace.id})`);
  if (result.bootstrap) {
    console.log(
      `demo seed: ${result.bootstrap.postsSynced} posts, ${result.bootstrap.insightsGenerated} insights`,
    );
  }
  if (result.warnings?.length) {
    console.log(`warnings: ${result.warnings.join(" / ")}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.details) console.error(err.details);
  process.exit(1);
});
