const db = require("../config/db");

const NotificationModel = {
  /**
   * Push a notification. Pass userId to target one user;
   * leave null to broadcast to all users.
   */
  async push(message, userId = null) {
    const { rows } = await db.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1,$2) RETURNING *`,
      [userId, message]
    );
    return rows[0];
  },

  async listForUser(userId, limit = 50) {
    const { rows } = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows;
  },

  async markAllRead(userId) {
    await db.query(
      `UPDATE notifications
       SET read = TRUE
       WHERE (user_id = $1 OR user_id IS NULL) AND read = FALSE`,
      [userId]
    );
  },

  async unreadCount(userId) {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE (user_id = $1 OR user_id IS NULL) AND read = FALSE`,
      [userId]
    );
    return rows[0].count;
  }
};

module.exports = NotificationModel;