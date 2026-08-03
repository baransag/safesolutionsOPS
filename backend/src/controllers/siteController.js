const SiteModel    = require("../models/siteModel");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/sites  (populates the "Select Site" dropdown)
const list = asyncHandler(async (req, res) => {
  const sites = await SiteModel.findAllActive();
  res.json({ success: true, sites });
});

// POST /api/sites  (Controller/Boss only)
const create = asyncHandler(async (req, res) => {
  const site = await SiteModel.create(req.body);
  res.status(201).json({ success: true, site });
});

module.exports = { list, create };