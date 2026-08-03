const db = require("../config/db");

const SettingsModel = {
  async get() {
    const { rows } = await db.query("SELECT * FROM settings WHERE id = 1");
    return rows[0] || null;
  },

  async update(data) {
    const fields = [];
    const params = [];
    const map = {
      officeLat:          "office_lat",
      officeLng:          "office_lng",
      officeRadiusMeters: "office_radius_meters",
      officeStartTime:    "office_start_time",
      officeEndTime:      "office_end_time",
      lateGraceMinutes:   "late_grace_minutes",
      darkMode:           "dark_mode",
      emailNotif:         "email_notif",
      pushNotif:          "push_notif"
    };

    Object.entries(map).forEach(([jsKey, col]) => {
      if (data[jsKey] !== undefined) {
        params.push(data[jsKey]);
        fields.push(`${col} = $${params.length}`);
      }
    });

    if (fields.length === 0) return this.get();

    const { rows } = await db.query(
      `UPDATE settings SET ${fields.join(", ")} WHERE id = 1 RETURNING *`,
      params
    );
    return rows[0];
  }
};

module.exports = SettingsModel;