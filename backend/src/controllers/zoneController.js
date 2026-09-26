const pool = require("../config/db");

// GET /api/zones — list all zones, with mine name joined in
async function getAllZones(req, res) {
  try {
    const result = await pool.query(
      `SELECT rz.id, rz.name, rz.area_hectares, rz.latitude, rz.longitude,
              rz.status, rz.created_at,
              m.id AS mine_id, m.name AS mine_name
       FROM rehabilitation_zones rz
       JOIN mines m ON m.id = rz.mine_id
       ORDER BY rz.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch zones" });
  }
}

// GET /api/zones/:id — single zone detail
async function getZoneById(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT rz.id, rz.name, rz.area_hectares, rz.latitude, rz.longitude,
              rz.status, rz.created_at,
              m.id AS mine_id, m.name AS mine_name, m.registration_number
       FROM rehabilitation_zones rz
       JOIN mines m ON m.id = rz.mine_id
       WHERE rz.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Zone not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch zone" });
  }
}

module.exports = { getAllZones, getZoneById };