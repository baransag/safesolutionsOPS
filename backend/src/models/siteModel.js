const db = require("../config/db");

const SiteModel = {
  async findAllActive() {
    const { rows } = await db.query(
      "SELECT * FROM sites WHERE active = TRUE ORDER BY name"
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query("SELECT * FROM sites WHERE id = $1", [id]);
    return rows[0] || null;
  },

  async create(data) {
    const { rows } = await db.query(
      `INSERT INTO sites (name, latitude, longitude, radius_meters)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [
        data.name,
        data.latitude     ?? null,
        data.longitude    ?? null,
        data.radiusMeters || 500
      ]
    );
    return rows[0];
  }
};
module.exports = SiteModel;