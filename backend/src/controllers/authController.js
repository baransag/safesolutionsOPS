const bcrypt        = require("../utils/bcryptWrapper");
const crypto        = require("crypto");
const UserModel     = require("../models/userModel");
const EmployeeModel = require("../models/employeeModel");
const AuditModel    = require("../models/auditModel");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { ApiError }  = require("../middleware/errorHandler");
const asyncHandler  = require("../utils/asyncHandler");
const env           = require("../config/env");

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const username = (body.username || "").trim();
  const password = body.password || "";

  if (!username || !password) {
    throw new ApiError(400, "Username and password are required.");
  }

  let user;
  try {
    user = await UserModel.findByUsername(username);
  } catch (err) {
    console.error("Database lookup error during login:", err);
    throw new ApiError(500, `Database error: ${err.message}`);
  }

  if (!user) {
    throw new ApiError(401, "Invalid username or password.");
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new ApiError(401, "Invalid username or password.");
  }

  const employee = await EmployeeModel.findById(user.employee_id);

  console.log("Employee:", employee);

  if (!employee) {
    throw new ApiError(500, "Employee record missing for this user.");
  }

  if (employee.status !== "active") {
    throw new ApiError(403, "This account has been deactivated.");
  }

  const tokenPayload = {
    userId: user.id,
    employeeId: user.employee_id,
    username: user.username,
    role: user.role
  };

  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken({ userId: user.id });

  await UserModel.setRefreshToken(user.id, refreshToken);
  await AuditModel.log(user.id, "LOGIN", "user", user.id);

  console.log("✅ Login Successful");
  console.log("==============================");

  res.json({
    success: true,
    accessToken,
    refreshToken,
    session: {
      userId: user.id,
      employeeId: user.employee_id,
      username: user.username,
      role: user.role,
      name: employee.name,
      image: employee.image,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      designation: employee.designation,
      joinDate: employee.join_date,
      firstLogin: user.first_login
    }
  });
});

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, "Refresh token is required.");

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  const user = await UserModel.findById(decoded.userId);
  if (!user || user.refresh_token !== refreshToken) {
    throw new ApiError(401, "Refresh token no longer valid.");
  }

  const accessToken = signAccessToken({
    userId:     user.id,
    employeeId: user.employee_id,
    username:   user.username,
    role:       user.role
  });

  res.json({ success: true, accessToken });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  await UserModel.setRefreshToken(req.user.userId, null);
  await AuditModel.log(req.user.userId, "LOGOUT", "user", req.user.userId);
  res.json({ success: true });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.user.userId);
  if (!user) throw new ApiError(404, "User not found.");

  const employee = await EmployeeModel.findById(user.employee_id);
  res.json({
    success: true,
    session: {
      userId:      user.id,
      employeeId:  user.employee_id,
      username:    user.username,
      role:        user.role,
      name:        employee?.name,
      image:       employee?.image,
      email:       employee?.email,
      phone:       employee?.phone,
      department:  employee?.department,
      designation: employee?.designation,
      joinDate:    employee?.join_date,
      firstLogin:  user.first_login
    }
  });
});

// POST /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters.");
  }

  const user = await UserModel.findById(req.user.userId);
  if (!user) throw new ApiError(404, "User not found.");

  // Skip current-password check only on very first login (forced password change).
  if (!user.first_login) {
    const match = await bcrypt.compare(currentPassword || "", user.password_hash);
    if (!match) throw new ApiError(401, "Current password is incorrect.");
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await UserModel.updatePassword(user.id, hash);
  await AuditModel.log(user.id, "CHANGE_PASSWORD", "user", user.id);

  res.json({ success: true });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) throw new ApiError(400, "Username is required.");

  const user = await UserModel.findByUsername(username);
  // Always respond success to avoid leaking valid usernames.
  if (!user) {
    return res.json({
      success: true,
      message: "If the account exists, a reset link has been issued."
    });
  }

  const token   = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await UserModel.setResetToken(username, token, expires);

  res.json({
    success: true,
    message: "If the account exists, a reset link has been issued.",
    // Expose token in non-production so the frontend/testers can use it directly.
    ...(env.NODE_ENV !== "production" ? { resetToken: token } : {})
  });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6) {
    throw new ApiError(400, "A valid token and a new password (min 6 chars) are required.");
  }

  const user = await UserModel.findByResetToken(token);
  if (!user) throw new ApiError(400, "Reset token is invalid or has expired.");

  const hash = await bcrypt.hash(newPassword, 10);
  await UserModel.updatePassword(user.id, hash);
  await UserModel.clearResetToken(user.id);
  await AuditModel.log(user.id, "RESET_PASSWORD", "user", user.id);

  res.json({ success: true });
});

module.exports = { login, refresh, logout, me, changePassword, forgotPassword, resetPassword };