const pool = require("../config/db");

// GET /api/public/mines
async function getPublicMines(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, location FROM mines ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mines" });
  }
}

// GET /api/public/zones
async function getPublicZones(req, res) {
  try {
    const result = await pool.query(
      `SELECT rz.id, rz.name, rz.status, rz.area_hectares, rz.latitude, rz.longitude,
              m.name AS mine_name
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

// GET /api/public/zones/:id/activities — only APPROVED activities are public
async function getPublicZoneActivities(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ra.id, ra.activity_type, ra.description, ra.measurement, ra.unit,
              ra.activity_date, ra.status,
              u.name AS performed_by_name,
              c.name AS performed_by_company
       FROM rehabilitation_activities ra
       LEFT JOIN users u ON u.id = ra.performed_by
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE ra.zone_id = $1 AND ra.status = 'APPROVED'
       ORDER BY ra.activity_date DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch zone activities" });
  }
}

module.exports = { getPublicMines, getPublicZones, getPublicZoneActivities };