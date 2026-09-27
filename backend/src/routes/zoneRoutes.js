const express = require("express");
const router = express.Router();
const { getAllZones, getZoneById } = require("../controllers/zoneController");

router.get("/", getAllZones);
router.get("/:id", getZoneById);

module.exports = router;