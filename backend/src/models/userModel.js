const db = require("../config/db");

const UserModel = {
  async findByUsername(username) {
    const { rows } = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username.trim()]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0] || null;
  },

  async findByEmployeeId(employeeId) {
    const { rows } = await db.query(
      "SELECT * FROM users WHERE employee_id = $1",
      [employeeId]
    );
    return rows[0] || null;
  },

  async create({ employeeId, username, passwordHash, role, firstLogin = true }) {
    const { rows } = await db.query(
      `INSERT INTO users (employee_id, username, password_hash, role, first_login)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [employeeId, username, passwordHash, role, firstLogin]
    );
    return rows[0];
  },

  async updatePassword(userId, passwordHash) {
    const { rows } = await db.query(
      `UPDATE users SET password_hash = $2, first_login = FALSE WHERE id = $1 RETURNING *`,
      [userId, passwordHash]
    );
    return rows[0];
  },

  async updateRole(employeeId, role) {
    const { rows } = await db.query(
      `UPDATE users SET role = $2 WHERE employee_id = $1 RETURNING *`,
      [employeeId, role]
    );
    return rows[0];
  },

  async setResetToken(username, token, expires) {
    const { rows } = await db.query(
      `UPDATE users SET reset_token = $2, reset_token_expires = $3
       WHERE username = $1 RETURNING *`,
      [username, token, expires]
    );
    return rows[0];
  },

  async findByResetToken(token) {
    const { rows } = await db.query(
      `SELECT * FROM users
       WHERE reset_token = $1 AND reset_token_expires > now()`,
      [token]
    );
    return rows[0] || null;
  },

  async clearResetToken(userId) {
    await db.query(
      `UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1`,
      [userId]
    );
  },

  async setRefreshToken(userId, token) {
    await db.query(
      `UPDATE users SET refresh_token = $2 WHERE id = $1`,
      [userId, token]
    );
  },

  async deleteByEmployeeId(employeeId) {
    await db.query("DELETE FROM users WHERE employee_id = $1", [employeeId]);
  }
};

module.exports = UserModel;