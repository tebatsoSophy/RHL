const express = require("express");
const { getAllCompanies } = require("../controllers/companyController");
const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", authenticateToken, requireAdmin, getAllCompanies);

module.exports = router;