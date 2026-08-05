const { Pool } = require("pg");
const env = require("./env");

const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};