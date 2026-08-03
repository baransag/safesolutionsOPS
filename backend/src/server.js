const app = require("./app");
const env = require("./config/env");
const { pool } = require("./config/db");

const server = app.listen(env.PORT, () => {
  console.log(
    `Safe Solutions backend listening on port ${env.PORT} [${env.NODE_ENV}]`
  );
});

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully…`);
  server.close(async () => {
    await pool.end();
    console.log("Closed HTTP server and DB pool.");
    process.exit(0);
  });
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});