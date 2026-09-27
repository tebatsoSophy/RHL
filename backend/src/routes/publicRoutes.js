const express = require("express");
const router = express.Router();
const {
  getPublicMines,
  getPublicZones,
  getPublicZoneActivities,
} = require("../controllers/publicController");

router.get("/mines", getPublicMines);
router.get("/zones", getPublicZones);
router.get("/zones/:id/activities", getPublicZoneActivities);

module.exports = router;