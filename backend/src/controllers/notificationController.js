const NotificationModel = require("../models/notificationModel");
const asyncHandler      = require("../utils/asyncHandler");

// GET /api/notifications
const list = asyncHandler(async (req, res) => {
  const notifications = await NotificationModel.listForUser(req.user.userId);
  res.json({ success: true, notifications });
});

// GET /api/notifications/unread-count
const unreadCount = asyncHandler(async (req, res) => {
  const count = await NotificationModel.unreadCount(req.user.userId);
  res.json({ success: true, count });
});

// POST /api/notifications/mark-all-read
const markAllRead = asyncHandler(async (req, res) => {
  await NotificationModel.markAllRead(req.user.userId);
  res.json({ success: true });
});

module.exports = { list, unreadCount, markAllRead };