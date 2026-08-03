const SettingsModel = require("../models/settingsModel");
const asyncHandler  = require("../utils/asyncHandler");

// GET /api/settings
const getSettings = asyncHandler(async (req, res) => {
  const settings = await SettingsModel.get();
  res.json({ success: true, settings });
});

// PUT /api/settings  (Controller/Boss only)
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await SettingsModel.update(req.body);
  res.json({ success: true, settings });
});

module.exports = { getSettings, updateSettings };