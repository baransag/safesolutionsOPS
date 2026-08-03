const AttendanceModel = require("../models/attendanceModel");
const EmployeeModel   = require("../models/employeeModel");
const asyncHandler    = require("../utils/asyncHandler");
const { sendPdf }     = require("../utils/exportPdf");
const { sendExcel }   = require("../utils/exportExcel");

function hoursBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  const hrs = (oh + om / 60) - (ih + im / 60);
  return hrs > 0 ? hrs : 0;
}

/** Shared aggregation — mirrors API.getReports() in the frontend. */
async function buildReport(filters) {
  const records   = await AttendanceModel.findAll(filters);
  const employees = await EmployeeModel.findAll();

  const byEmployee = {};
  employees.forEach((emp) => {
    byEmployee[emp.id] = {
      name:    emp.name,
      present: 0,
      absent:  0,
      late:    0,
      leave:   0,
      hours:   0
    };
  });

  records.forEach((r) => {
    const bucket = byEmployee[r.employee_id];
    if (!bucket) return;
    if (r.status === "present") bucket.present++;
    if (r.status === "absent")  bucket.absent++;
    if (r.status === "late")    bucket.late++;
    if (r.status === "leave")   bucket.leave++;
    bucket.hours += hoursBetween(r.check_in, r.check_out);
  });

  const byDate = {};
  records.forEach((r) => {
    byDate[r.date] = (byDate[r.date] || 0) + 1;
  });

  const summary = {
    total:   records.length,
    present: records.filter((r) => r.status === "present").length,
    absent:  records.filter((r) => r.status === "absent").length,
    late:    records.filter((r) => r.status === "late").length,
    pending: records.filter((r) => r.approval_status === "pending").length
  };

  return { summary, byEmployee, byDate, records };
}

// GET /api/reports
const getReports = asyncHandler(async (req, res) => {
  const data = await buildReport(req.query);
  res.json({ success: true, ...data });
});

// GET /api/reports/export/pdf
const exportPdf = asyncHandler(async (req, res) => {
  const { byEmployee } = await buildReport(req.query);
  const rows = Object.values(byEmployee).map((e) => ({
    ...e, hours: e.hours.toFixed(1)
  }));
  const columns = [
    { header: "Employee",    key: "name"    },
    { header: "Present",     key: "present" },
    { header: "Absent",      key: "absent"  },
    { header: "Late",        key: "late"    },
    { header: "Leave",       key: "leave"   },
    { header: "Total Hours", key: "hours"   }
  ];
  sendPdf(res, "attendance-report.pdf", "Safe Solutions - Attendance Report", columns, rows);
});

// GET /api/reports/export/excel
const exportExcel = asyncHandler(async (req, res) => {
  const { byEmployee } = await buildReport(req.query);
  const rows = Object.values(byEmployee).map((e) => ({
    ...e, hours: Number(e.hours.toFixed(1))
  }));
  const columns = [
    { header: "Employee",     key: "name",    width: 28 },
    { header: "Present Days", key: "present", width: 14 },
    { header: "Absent Days",  key: "absent",  width: 14 },
    { header: "Late Days",    key: "late",    width: 14 },
    { header: "Leave Days",   key: "leave",   width: 14 },
    { header: "Total Hours",  key: "hours",   width: 14 }
  ];
  await sendExcel(res, "attendance-report.xlsx", columns, rows);
});

// GET /api/reports/export/history/excel  (raw attendance history export)
const exportHistoryExcel = asyncHandler(async (req, res) => {
  const records = await AttendanceModel.findAll(req.query);
  const rows = records.map((r) => ({
    date:           r.date,
    employee:       r.employee_name,
    type:           r.type,
    checkIn:        r.check_in        || "",
    checkOut:       r.check_out       || "",
    status:         r.status,
    approvalStatus: r.approval_status
  }));
  const columns = [
    { header: "Date",            key: "date",           width: 14 },
    { header: "Employee",        key: "employee",       width: 28 },
    { header: "Type",            key: "type",           width: 12 },
    { header: "Check In",        key: "checkIn",        width: 12 },
    { header: "Check Out",       key: "checkOut",       width: 12 },
    { header: "Status",          key: "status",         width: 12 },
    { header: "Approval Status", key: "approvalStatus", width: 16 }
  ];
  await sendExcel(res, "attendance-history.xlsx", columns, rows);
});

module.exports = { getReports, exportPdf, exportExcel, exportHistoryExcel };