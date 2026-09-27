const express = require("express");
const router = express.Router();
const { getAllMines, getMineById } = require("../controllers/mineController");

router.get("/", getAllMines);
router.get("/:id", getMineById);

module.exports = router;