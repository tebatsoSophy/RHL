const express = require("express");

const {
    getMyZones
} = require("../controllers/workerController");

const authenticateToken =
    require("../middleware/authMiddleware");

const requireWorker =
    require("../middleware/workerMiddleware");

const router = express.Router();


router.get(
    "/zones",
    authenticateToken,
    requireWorker,
    getMyZones
);


module.exports = router;