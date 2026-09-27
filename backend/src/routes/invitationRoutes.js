const express = require("express");

const {
createInvitation,
verifyInvitation,
acceptInvitation,
getMyInvitations
} = require("../controllers/invitationController");

const authenticateToken =
require("../middleware/authMiddleware");

const { requireAdmin } =
require("../middleware/adminMiddleware");

const router = express.Router();

// ============================================================
// ADMIN: SEND INVITATION
// ============================================================

router.post(
"/",
authenticateToken,
requireAdmin,
createInvitation
);

// ============================================================
// VERIFY INVITATION
// Public route — user has the invitation token
// ============================================================

router.get(
"/verify",
verifyInvitation
);

// ============================================================
// ACCEPT INVITATION
// Public route — token + OTP creates the account
// ============================================================

router.post(
"/accept",
acceptInvitation
);

// ============================================================
// GET MY INVITATIONS
// Authenticated MINE user
// ============================================================

router.get(
"/mine",
authenticateToken,
getMyInvitations
);

module.exports = router;
