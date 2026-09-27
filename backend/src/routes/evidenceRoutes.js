const express = require("express");
const { uploadEvidence, getActivityEvidence, verifyEvidence } = require("../controllers/evidenceController");
const authenticateToken = require("../middleware/authMiddleware");
const requireWorker = require("../middleware/workerMiddleware");
const upload = require("../middleware/uploadMiddleware");
const verifyFileSignature = require("../middleware/fileSignatureMiddleware");

const router = express.Router();

router.post(
    "/:activityId",
    authenticateToken,
    requireWorker,
    upload.single("file"),
    verifyFileSignature,   
    uploadEvidence
);
router.get("/:activityId", authenticateToken, requireWorker, getActivityEvidence);
router.get("/verify/:evidenceId", authenticateToken, requireWorker, verifyEvidence);

module.exports = router;