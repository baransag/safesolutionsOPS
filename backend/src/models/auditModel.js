const db = require("../config/db");

const AuditModel = {
  /**
   * @param {string}      actorUserId  UUID of the user performing the action
   * @param {string}      action       e.g. "LOGIN", "APPROVE_ATTENDANCE"
   * @param {string}      entityType   e.g. "user", "attendance", "office_qr"
   * @param {string|null} entityId     UUID of the affected record (or null)
   * @param {object}      details      Extra JSONB payload
   */
  async log(actorUserId, action, entityType, entityId = null, details = {}) {
    await db.query(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1,$2,$3,$4,$5)`,
      [actorUserId, action, entityType, entityId || null, JSON.stringify(details)]
    );
  }
};

module.exports = AuditModel;