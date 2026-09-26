const express = require("express");
const { createActivity, getZoneActivities } = require("../controllers/activityController");
const authenticateToken = require("../middleware/authMiddleware");
const requireWorker = require("../middleware/workerMiddleware");

const router = express.Router();

router.post("/", authenticateToken, requireWorker, createActivity);
router.get("/zone/:zoneId", authenticateToken, requireWorker, getZoneActivities);

module.exports = router;