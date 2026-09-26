const pool = require("../config/db");

// GET /api/mines — list all mines
async function getAllMines(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, registration_number, location, created_at
       FROM mines
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mines" });
  }
}

// GET /api/mines/:id — single mine + its zones
async function getMineById(req, res) {
  const { id } = req.params;
  try {
    const mineResult = await pool.query(
      `SELECT id, name, registration_number, location, created_at
       FROM mines WHERE id = $1`,
      [id]
    );

    if (mineResult.rows.length === 0) {
      return res.status(404).json({ error: "Mine not found" });
    }

    const zonesResult = await pool.query(
      `SELECT id, name, area_hectares, latitude, longitude, status, created_at
       FROM rehabilitation_zones
       WHERE mine_id = $1
       ORDER BY name ASC`,
      [id]
    );

    res.json({
      ...mineResult.rows[0],
      zones: zonesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mine" });
  }
}

module.exports = { getAllMines, getMineById };