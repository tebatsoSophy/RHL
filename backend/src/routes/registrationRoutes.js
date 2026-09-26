const express = require("express");

const {
    createRegistrationRequest,
    getRegistrationRequests,
    approveRegistrationRequest
} = require("../controllers/registrationController");

const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

// Public registration request
router.post(
    "/",
    createRegistrationRequest
);

// Admin views registration requests
router.get(
    "/",
    authenticateToken,
    requireAdmin,
    getRegistrationRequests
);

// Admin approves registration request
router.post(
    "/:id/approve",
    authenticateToken,
    requireAdmin,
    approveRegistrationRequest
);

module.exports = router;