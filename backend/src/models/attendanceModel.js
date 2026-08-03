const db = require("../config/db");

const AttendanceModel = {
  async findAll(filters = {}) {
    const clauses = [];
    const params  = [];

    if (filters.employeeId)    { params.push(filters.employeeId);    clauses.push(`employee_id = $${params.length}`);     }
    if (filters.date)          { params.push(filters.date);          clauses.push(`date = $${params.length}`);            }
    if (filters.type)          { params.push(filters.type);          clauses.push(`type = $${params.length}`);            }
    if (filters.status)        { params.push(filters.status);        clauses.push(`status = $${params.length}`);          }
    if (filters.approvalStatus){ params.push(filters.approvalStatus);clauses.push(`approval_status = $${params.length}`); }
    if (filters.fromDate)      { params.push(filters.fromDate);      clauses.push(`date >= $${params.length}`);           }
    if (filters.toDate)        { params.push(filters.toDate);        clauses.push(`date <= $${params.length}`);           }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await db.query(
      `SELECT * FROM attendance ${where} ORDER BY created_at DESC`,
      params
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query(
      "SELECT * FROM attendance WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Returns the most recent attendance record for a given employee/type/date,
   * regardless of whether it is open or closed. Callers inspect check_out to
   * determine state.
   */
  async findOpenForToday(employeeId, type, date) {
    const { rows } = await db.query(
      `SELECT * FROM attendance
       WHERE employee_id = $1 AND type = $2 AND date = $3
       ORDER BY created_at DESC LIMIT 1`,
      [employeeId, type, date]
    );
    return rows[0] || null;
  },

  async create(data) {
    const { rows } = await db.query(
      `INSERT INTO attendance
         (employee_id, employee_name, type, date, check_in, check_out, site,
          latitude, longitude, gps_accuracy, within_geofence, selfie_path, site_photo_path,
          status, approval_status, notes, qr_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        data.employeeId,
        data.employeeName,
        data.type,
        data.date             || new Date(),
        data.checkIn          || null,
        data.checkOut         || null,
        data.site             || null,
        data.latitude         ?? null,
        data.longitude        ?? null,
        data.gpsAccuracy      ?? null,
        data.withinGeofence   ?? null,
        data.selfiePath       || null,
        data.sitePhotoPath    || null,
        data.status           || "present",
        data.approvalStatus   || "pending",
        data.notes            || "",
        data.qrVerified       ?? false
      ]
    );
    return rows[0];
  },

  async update(id, data) {
    const fields = [];
    const params = [];
    const map = {
      checkIn:        "check_in",
      checkOut:       "check_out",
      site:           "site",
      latitude:       "latitude",
      longitude:      "longitude",
      gpsAccuracy:    "gps_accuracy",
      withinGeofence: "within_geofence",
      selfiePath:     "selfie_path",
      sitePhotoPath:  "site_photo_path",
      status:         "status",
      approvalStatus: "approval_status",
      notes:          "notes",
      qrVerified:     "qr_verified",
      approvedBy:     "approved_by"
    };

    Object.entries(map).forEach(([jsKey, col]) => {
      if (data[jsKey] !== undefined) {
        params.push(data[jsKey]);
        fields.push(`${col} = $${params.length}`);
      }
    });

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    const { rows } = await db.query(
      `UPDATE attendance SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rowCount } = await db.query(
      "DELETE FROM attendance WHERE id = $1",
      [id]
    );
    return rowCount > 0;
  }
};

module.exports = AttendanceModel;