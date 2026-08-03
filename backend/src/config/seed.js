/* =========================================================================
   DATABASE SEEDER
   Creates the schema, inserts lookup data (seed.sql), then creates every
   employee + user record that the frontend's Seed.init() would have created.

     Controller  03468760963 / Safe@123
     Boss        03216684665 / Safe@123
     ...

   Run with: npm run seed
   ========================================================================= */
const bcrypt  = require("bcrypt");
const fs      = require("fs");
const path    = require("path");
const QRCode  = require("qrcode");
const { pool } = require("./db");
const env     = require("./env");

const OFFICE_QR_CODE = "SAFE-SOLUTIONS-HQ-001";

const ROLES = {
  EMPLOYEE:   "Employee",
  MANAGER:    "Manager",
  CONTROLLER: "Controller",
  BOSS:       "Boss"
};

const RAW_PEOPLE = [
  { name: "M. Husnain Farooq",   role: ROLES.CONTROLLER, image: "M. Husnain Farooq.jpeg",   username: "03468760963", designation: "System Administrator", department: "Management" },
  { name: "Asif",                role: ROLES.BOSS,       image: "Asif.jpeg",                 username: "03216684665", designation: "Chief Executive",       department: "Management" },
  { name: "Samaira Mubashar",    role: ROLES.MANAGER,    image: "Samaira Mubashar.jpeg",     username: "03006646124", designation: "HR Manager",            department: "HR"         },
  { name: "Shahbaz Ahmed",       role: ROLES.MANAGER,    image: "Shahbaz Ahmed.jpeg",        username: "03237684200", designation: "Operations Manager",    department: "Operations" },
  { name: "ENGR SHAHZAIB AHMAD", role: ROLES.EMPLOYEE,   image: "ENGR SHAHZAIB AHMAD.jpeg",  username: "03007684761", designation: "Site Engineer",          department: "Field Ops"  },
  { name: "Adnan Ali",           role: ROLES.EMPLOYEE,   image: "Adnan Ali.jpeg",            username: "03217684400", designation: "Technician",             department: "Field Ops"  },
  { name: "Adnan Tahir",         role: ROLES.EMPLOYEE,   image: "Adnan Tahir.jpeg",           username: "03237864100", designation: "Site Engineer",          department: "Field Ops"  },
  { name: "Rehan Ali",           role: ROLES.EMPLOYEE,   image: "Rehan Ali.jpeg",            username: "03237674000", designation: "Supervisor",             department: "Operations" },
  { name: "M. Soulat Raza",      role: ROLES.EMPLOYEE,   image: "M. Soulat Raza.jpeg",       username: "03397684700", designation: "Software Engineer",      department: "IT"         },
  { name: "Muneeb Ahmad",        role: ROLES.EMPLOYEE,   image: "Muneeb Ahmad.jpeg",         username: "03077684400", designation: "Accountant",             department: "Finance"    },
  { name: "M. Zahid",            role: ROLES.EMPLOYEE,   image: "M. Zahid.jpeg",             username: "03079682902", designation: "Store Keeper",           department: "Inventory"  },
  { name: "Tajammul Mushtaq",    role: ROLES.EMPLOYEE,   image: "Tajammul Mushtaq.jpeg",     username: "03217684500", designation: "Electrician",            department: "Field Ops"  }
];

async function run() {
  const client = await pool.connect();
  try {
    console.log("Running schema.sql …");
    const schemaSql = fs.readFileSync(
      path.join(__dirname, "..", "..", "sql", "schema.sql"), "utf8"
    );
    await client.query(schemaSql);

    console.log("Running seed.sql (settings + sites) …");
    const seedSql = fs.readFileSync(
      path.join(__dirname, "..", "..", "sql", "seed.sql"), "utf8"
    );
    await client.query(seedSql);

    const passwordHash = await bcrypt.hash(env.DEFAULT_PASSWORD, 10);

    await client.query("BEGIN");

    for (const p of RAW_PEOPLE) {
      const { rows: existing } = await client.query(
        "SELECT id FROM users WHERE username = $1",
        [p.username]
      );
      if (existing.length > 0) {
        console.log(`  Skipping ${p.username} — already exists`);
        continue;
      }

      const code  = "EMP-" + String(RAW_PEOPLE.indexOf(p) + 1).padStart(4, "0");
      const email = p.username + "@safesolutions.com";

      const { rows: empRows } = await client.query(
        `INSERT INTO employees (name, role, image, designation, department, email, phone, code, join_date, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,'active')
         RETURNING id`,
        [p.name, p.role, p.image, p.designation, p.department, email, p.username, code]
      );
      const employeeId = empRows[0].id;

      await client.query(
        `INSERT INTO users (employee_id, username, password_hash, role, first_login)
         VALUES ($1,$2,$3,$4,FALSE)`,
        [employeeId, p.username, passwordHash, p.role]
      );

      console.log(`  Seeded ${p.role.padEnd(10)} ${p.name} (${p.username})`);
    }

    await client.query("COMMIT");

    console.log("\nGenerating the permanent office QR code …");
    const pngBuffer = await QRCode.toBuffer(OFFICE_QR_CODE, {
      type: "png",
      errorCorrectionLevel: "H",
      margin: 2,
      scale: 8
    });

    const { rows: qrRows } = await client.query(
      `INSERT INTO office_qr (id, code, image_base64)
       VALUES (1, $1, $2)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [OFFICE_QR_CODE, pngBuffer.toString("base64")]
    );

    if (qrRows.length > 0) {
      console.log(`  Office QR created: ${OFFICE_QR_CODE}`);
    } else {
      console.log("  Office QR already exists — skipped.");
    }

    console.log(`\n✅ Seed complete. Default password for all accounts: ${env.DEFAULT_PASSWORD}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();