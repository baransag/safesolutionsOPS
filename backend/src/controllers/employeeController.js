const bcrypt        = require("bcrypt");
const EmployeeModel = require("../models/employeeModel");
const UserModel     = require("../models/userModel");
const AuditModel    = require("../models/auditModel");
const asyncHandler  = require("../utils/asyncHandler");
const { ApiError }  = require("../middleware/errorHandler");
const env           = require("../config/env");
const { saveBase64Image } = require("../utils/uploadHelper");

// GET /api/employees
const list = asyncHandler(async (req, res) => {
  const { department, search, status } = req.query;
  const employees = await EmployeeModel.findAll({ department, search, status });
  res.json({ success: true, employees });
});

// GET /api/employees/:id
const getOne = asyncHandler(async (req, res) => {
  const employee = await EmployeeModel.findById(req.params.id);
  if (!employee) throw new ApiError(404, "Employee not found.");
  res.json({ success: true, employee });
});

// POST /api/employees  (Controller/Boss only)
const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (!data.name) throw new ApiError(400, "Employee name is required.");
  if (!data.phone && !data.email) {
    throw new ApiError(400, "Phone or email is required to create a login.");
  }

  if (req.file) {
    data.image = `employees/${req.file.filename}`;
  } else if (data.image && data.image.startsWith("data:image/")) {
    data.image = saveBase64Image(data.image, "employees");
  }
  if (!data.code) data.code = await EmployeeModel.nextCode(data.phone);

  const employee = await EmployeeModel.create(data);

  const username = data.phone || data.email;
  const existing = await UserModel.findByUsername(username);
  if (existing) throw new ApiError(409, "A login already exists for this phone/email.");

  const passwordHash = await bcrypt.hash(env.DEFAULT_PASSWORD, 10);
  await UserModel.create({
    employeeId: employee.id,
    username,
    passwordHash,
    role: employee.role,
    firstLogin: true
  });

  await AuditModel.log(
    req.user.userId, "CREATE_EMPLOYEE", "employee", employee.id,
    { name: employee.name }
  );

  res.status(201).json({ success: true, employee });
});

// PUT /api/employees/:id  (Controller/Boss only)
const update = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.image = `employees/${req.file.filename}`;
  } else if (data.image && data.image.startsWith("data:image/")) {
    data.image = saveBase64Image(data.image, "employees");
  }

  const employee = await EmployeeModel.update(req.params.id, data);
  if (!employee) throw new ApiError(404, "Employee not found.");

  if (data.role) await UserModel.updateRole(employee.id, data.role);

  await AuditModel.log(
    req.user.userId, "UPDATE_EMPLOYEE", "employee", employee.id, data
  );

  res.json({ success: true, employee });
});

// DELETE /api/employees/:id  (Controller/Boss only)
const remove = asyncHandler(async (req, res) => {
  const employee = await EmployeeModel.findById(req.params.id);
  if (!employee) throw new ApiError(404, "Employee not found.");

  // Users are cascade-deleted by FK, but explicit for clarity.
  await UserModel.deleteByEmployeeId(req.params.id);
  await EmployeeModel.remove(req.params.id);

  await AuditModel.log(
    req.user.userId, "DELETE_EMPLOYEE", "employee", req.params.id,
    { name: employee.name }
  );

  res.json({ success: true });
});

// PATCH /api/employees/me  (self-service — any logged-in user)
const updateOwnProfile = asyncHandler(async (req, res) => {
  const allowed = ["name", "email", "phone", "designation"];
  const data = {};
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) data[k] = req.body[k];
  });
  if (req.file) {
    data.image = `employees/${req.file.filename}`;
  } else if (req.body.image && req.body.image.startsWith("data:image/")) {
    data.image = saveBase64Image(req.body.image, "employees");
  }

  const employee = await EmployeeModel.update(req.user.employeeId, data);
  if (!employee) throw new ApiError(404, "Employee not found.");

  res.json({ success: true, employee });
});

module.exports = { list, getOne, create, update, remove, updateOwnProfile };