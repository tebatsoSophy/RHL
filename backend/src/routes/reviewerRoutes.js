const express = require("express");
const { getMyReviewZones } = require("../controllers/reviewerController");
const authenticateToken = require("../middleware/authMiddleware");
const requireReviewer = require("../middleware/reviewerMiddleware");

const router = express.Router();

router.get("/zones", authenticateToken, requireReviewer, getMyReviewZones);

module.exports = router;