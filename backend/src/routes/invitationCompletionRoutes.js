const express = require("express");

const {
    verifyInvitation,
    completeInvitation
} = require("../controllers/invitationCompletionController");

const router = express.Router();

router.post(
    "/verify",
    verifyInvitation
);

router.post(
    "/complete",
    completeInvitation
);

module.exports = router;