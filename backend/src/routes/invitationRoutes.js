const express = require("express");

const {
    createInvitation,
    verifyInvitation,
    acceptInvitation,
    getMyInvitations
} = require("../controllers/invitationController");

const authenticateToken =
    require("../middleware/authMiddleware");

const requireAdmin =
    require("../middleware/adminMiddleware");

const router = express.Router();


// ADMIN
// Send invitation
router.post(
    "/",
    authenticateToken,
    requireAdmin,
    createInvitation
);

router.get(
    "/",
    authenticateToken,
    requireAdmin,
    getMyInvitations
);

// PUBLIC
// Worker opens invitation link
router.get(
    "/verify",
    verifyInvitation
);


// PUBLIC
// Worker accepts invitation
router.post(
    "/accept",
    acceptInvitation
);


module.exports = router;