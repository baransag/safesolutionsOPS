const db = require("../config/db");

const EmployeeModel = {
  async findAll({ department, search, status } = {}) {
    const clauses = [];
    const params  = [];

    if (department) {
      params.push(department);
      clauses.push(`department = $${params.length}`);
    }
    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const p = params.length;
      clauses.push(
        `(LOWER(name) LIKE $${p} OR LOWER(designation) LIKE $${p} OR LOWER(code) LIKE $${p})`
      );
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await db.query(
      `SELECT * FROM employees ${where} ORDER BY created_at DESC`,
      params
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query(
      "SELECT * FROM employees WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  },

  async create(data) {
    const { rows } = await db.query(
      `INSERT INTO employees
         (name, role, image, designation, department, email, phone, code, join_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        data.name,
        data.role        || "Employee",
        data.image       || "logo.jpeg",
        data.designation || "",
        data.department  || "",
        data.email       || "",
        data.phone       || "",
        data.code        || null,
        data.joinDate    || new Date(),
        data.status      || "active"
      ]
    );
    return rows[0];
  },

  async update(id, data) {
    const fields = [];
    const params = [];
    const map = {
      name:        "name",
      role:        "role",
      image:       "image",
      designation: "designation",
      department:  "department",
      email:       "email",
      phone:       "phone",
      code:        "code",
      joinDate:    "join_date",
      status:      "status"
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
      `UPDATE employees SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rowCount } = await db.query(
      "DELETE FROM employees WHERE id = $1",
      [id]
    );
    return rowCount > 0;
  },

  async nextCode(phone) {
    return "EMP-" + (phone ? phone.slice(-4) : Math.floor(1000 + Math.random() * 9000));
  },

  async count() {
    const { rows } = await db.query(
      "SELECT COUNT(*)::int AS count FROM employees"
    );
    return rows[0].count;
  }
};

module.exports = EmployeeModel;