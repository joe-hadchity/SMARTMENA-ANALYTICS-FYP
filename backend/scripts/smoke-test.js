/**
 * One-shot smoke test: boot the Express app on an ephemeral port and hit
 * a few endpoints to confirm nothing throws on require.
 */

const http = require("http");
const app = require("../src/app");

function get(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${path}`, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      })
      .on("error", reject);
  });
}

(async () => {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  console.log(`Smoke server on http://127.0.0.1:${port}`);

  const paths = [
    "/api/health",
    "/api/integrations/platform-capabilities",
  ];

  for (const p of paths) {
    try {
      const r = await get(port, p);
      console.log(`${p} -> ${r.status}`);
      console.log(r.body.slice(0, 400));
      console.log("---");
    } catch (err) {
      console.log(`${p} -> ERROR ${err.message}`);
    }
  }

  server.close();
  process.exit(0);
})();
