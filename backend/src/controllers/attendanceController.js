const AttendanceModel   = require("../models/attendanceModel");
const SettingsModel     = require("../models/settingsModel");
const NotificationModel = require("../models/notificationModel");
const AuditModel        = require("../models/auditModel");
const asyncHandler      = require("../utils/asyncHandler");
const { ApiError }      = require("../middleware/errorHandler");
const { distanceMeters } = require("../utils/geo");

function todayStr() {
  // Returns YYYY-MM-DD in the server's local timezone.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeNow() {
  // Returns HH:MM:SS in the server's local timezone.
  return new Date().toTimeString().slice(0, 8);
}

// GET /api/attendance
// Filters: employeeId, date, type, status, approvalStatus, fromDate, toDate
const list = asyncHandler(async (req, res) => {
  const records = await AttendanceModel.findAll(req.query);
  res.json({ success: true, records });
});

// GET /api/attendance/status/today?employeeId=&type=
// MUST be declared before /:id so Express does not match "status" as an id.
const todayStatus = asyncHandler(async (req, res) => {
  const { employeeId, type } = req.query;
  if (!employeeId || !type) {
    throw new ApiError(400, "employeeId and type are required.");
  }
  const record = await AttendanceModel.findOpenForToday(employeeId, type, todayStr());
  res.json({ success: true, record: record || null });
});

// GET /api/attendance/:id
const getOne = asyncHandler(async (req, res) => {
  const record = await AttendanceModel.findById(req.params.id);
  if (!record) throw new ApiError(404, "Attendance record not found.");
  res.json({ success: true, record });
});

// POST /api/attendance/check-in
// Accepts multipart/form-data (selfie file + text fields).
// Required fields: employeeId, employeeName, type
const checkIn = asyncHandler(async (req, res) => {
  const { employeeId, employeeName, type, site, latitude, longitude, qrVerified } = req.body;

  if (!employeeId || !employeeName || !type) {
    throw new ApiError(400, "employeeId, employeeName and type are required.");
  }

  const date     = todayStr();
  const existing = await AttendanceModel.findOpenForToday(employeeId, type, date);
  if (existing && existing.check_in && !existing.check_out) {
    throw new ApiError(409, "Already checked in for this type today. Check out first.");
  }

  // GPS geofence check for office check-ins
  let withinGeofence = null;
  if (type === "office" && latitude != null && longitude != null) {
    const settings = await SettingsModel.get();
    if (settings) {
      const dist = distanceMeters(
        parseFloat(latitude), parseFloat(longitude),
        settings.office_lat, settings.office_lng
      );
      withinGeofence = dist <= settings.office_radius_meters;
    }
  }

  // Store the relative path so /uploads/<path> resolves via the static server.
  const selfiePath = req.file ? `selfies/${req.file.filename}` : null;

  const record = await AttendanceModel.create({
    employeeId,
    employeeName,
    type,
    date,
    checkIn:        timeNow(),
    checkOut:       null,
    site:           site         || null,
    latitude:       latitude     != null ? parseFloat(latitude)  : null,
    longitude:      longitude    != null ? parseFloat(longitude) : null,
    withinGeofence,
    selfiePath,
    status:         "present",
    approvalStatus: "pending",
    qrVerified:     qrVerified === "true" || qrVerified === true
  });

  await NotificationModel.push(`${employeeName} checked in (${type}).`);
  res.status(201).json({ success: true, record });
});

// POST /api/attendance/check-out
// Accepts multipart/form-data (optional sitePhoto + text fields).
// Required fields: employeeId, type
const checkOut = asyncHandler(async (req, res) => {
  const { employeeId, type, latitude, longitude } = req.body;

  if (!employeeId || !type) {
    throw new ApiError(400, "employeeId and type are required.");
  }

  const date     = todayStr();
  const existing = await AttendanceModel.findOpenForToday(employeeId, type, date);
  if (!existing)           throw new ApiError(404, "No check-in found for today.");
  if (existing.check_out)  throw new ApiError(409, "Already checked out.");

  const updateData = { checkOut: timeNow() };
  if (req.file)        updateData.sitePhotoPath = `site/${req.file.filename}`;
  if (latitude != null)  updateData.latitude   = parseFloat(latitude);
  if (longitude != null) updateData.longitude  = parseFloat(longitude);

  const record = await AttendanceModel.update(existing.id, updateData);
  await NotificationModel.push(`${existing.employee_name} checked out (${type}).`);
  res.json({ success: true, record });
});

// POST /api/attendance  (manual create — Manager/Controller/Boss)
const create = asyncHandler(async (req, res) => {
  const record = await AttendanceModel.create(req.body);
  await NotificationModel.push(`${record.employee_name} - ${record.type} attendance recorded.`);
  res.status(201).json({ success: true, record });
});

// PUT /api/attendance/:id
const update = asyncHandler(async (req, res) => {
  const record = await AttendanceModel.update(req.params.id, req.body);
  if (!record) throw new ApiError(404, "Attendance record not found.");
  res.json({ success: true, record });
});

// DELETE /api/attendance/:id
const remove = asyncHandler(async (req, res) => {
  const ok = await AttendanceModel.remove(req.params.id);
  if (!ok) throw new ApiError(404, "Attendance record not found.");
  res.json({ success: true });
});

// POST /api/attendance/:id/approve
const approve = asyncHandler(async (req, res) => {
  const record = await AttendanceModel.update(req.params.id, {
    approvalStatus: "approved",
    approvedBy:     req.user.userId
  });
  if (!record) throw new ApiError(404, "Attendance record not found.");

  await NotificationModel.push(`Attendance for ${record.employee_name} approved.`);
  await AuditModel.log(req.user.userId, "APPROVE_ATTENDANCE", "attendance", record.id);
  res.json({ success: true, record });
});

// POST /api/attendance/:id/reject
const reject = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const record = await AttendanceModel.update(req.params.id, {
    approvalStatus: "rejected",
    notes:          reason || "",
    approvedBy:     req.user.userId
  });
  if (!record) throw new ApiError(404, "Attendance record not found.");

  await NotificationModel.push(`Attendance for ${record.employee_name} rejected.`);
  await AuditModel.log(
    req.user.userId, "REJECT_ATTENDANCE", "attendance", record.id, { reason }
  );
  res.json({ success: true, record });
});

module.exports = {
  list, getOne, checkIn, checkOut, create, update, remove,
  approve, reject, todayStatus
};