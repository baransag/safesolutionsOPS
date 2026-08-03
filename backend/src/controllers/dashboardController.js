const EmployeeModel  = require("../models/employeeModel");
const AttendanceModel = require("../models/attendanceModel");
const asyncHandler   = require("../utils/asyncHandler");

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// GET /api/dashboard/stats
const stats = asyncHandler(async (req, res) => {
  const employees    = await EmployeeModel.findAll();
  const today        = todayStr();
  const todayRecords = await AttendanceModel.findAll({ date: today });
  const pending      = await AttendanceModel.findAll({ approvalStatus: "pending" });

  const presentIds = new Set(
    todayRecords
      .filter((r) => r.status === "present" || r.status === "late")
      .map((r) => r.employee_id)
  );

  res.json({
    success: true,
    stats: {
      totalEmployees:   employees.length,
      presentToday:     presentIds.size,
      absentToday:      Math.max(employees.length - presentIds.size, 0),
      pendingApprovals: pending.length
    },
    recentActivity: todayRecords.slice(0, 10)
  });
});

// GET /api/dashboard/weekly-attendance  (last 7 days, counts per day)
const weeklyAttendance = asyncHandler(async (req, res) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }

  const results = [];
  for (const date of days) {
    const records = await AttendanceModel.findAll({ date });
    results.push({
      date,
      present: records.filter((r) => r.status === "present").length,
      absent:  records.filter((r) => r.status === "absent").length,
      late:    records.filter((r) => r.status === "late").length
    });
  }

  res.json({ success: true, weekly: results });
});

module.exports = { stats, weeklyAttendance };