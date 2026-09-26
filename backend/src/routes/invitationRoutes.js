const express = require("express");

const {
    createInvitation
} = require("../controllers/invitationController");

const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();


// Admin sends invitation
router.post(
    "/",
    authenticateToken,
    requireAdmin,
    createInvitation
);


module.exports = router;