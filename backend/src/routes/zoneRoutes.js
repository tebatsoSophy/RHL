const express = require("express");

const {
    getAllZones,
    getZoneById,
    createZone,
    updateZone,
    deleteZone
} = require("../controllers/zoneController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// VIEW ZONES
// ==========================================

router.get(
    "/",
    authenticateToken,
    getAllZones
);

router.get(
    "/:id",
    authenticateToken,
    getZoneById
);

// ==========================================
// CREATE ZONE
// ==========================================

router.post(
    "/mine/:mineId",
    authenticateToken,
    createZone
);

// ==========================================
// UPDATE ZONE
// ==========================================

router.put(
    "/:id",
    authenticateToken,
    updateZone
);

// ==========================================
// DELETE ZONE
// ==========================================

router.delete(
    "/:id",
    authenticateToken,
    deleteZone
);

module.exports = router;