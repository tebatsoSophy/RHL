const express = require("express");

const {
getAllMines,
getMineById,
createMine,
updateMine,
deleteMine
} = require("../controllers/mineController");

const authenticateToken = require("../middleware/authMiddleware");
const {
requireAdmin,
requireAdmins
} = require("../middleware/adminMiddleware");


const router = express.Router();

// Anyone authenticated can view mines
router.get(
"/",
authenticateToken,
getAllMines
);

router.get(
"/:id",
authenticateToken,
getMineById
);

// ADMIN ONLY
router.post(
"/",
authenticateToken,
requireAdmin,
createMine
);

router.put(
"/:id",
authenticateToken,
requireAdmins,
updateMine
);

router.delete(
"/:id",
authenticateToken,
requireAdmins,
deleteMine
);

module.exports = router;
