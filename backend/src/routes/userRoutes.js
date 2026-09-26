const express = require("express");

const {
    createUser
} = require("../controllers/userController");

const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

// Only admins can create users
router.post(
    "/",
    authenticateToken,
    requireAdmin,
    createUser
);

module.exports = router;