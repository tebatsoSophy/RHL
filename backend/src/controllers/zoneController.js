const pool = require("../config/db");

// GET /api/zones
async function getAllZones(req, res) {
    try {
        const result = await pool.query(
            `SELECT rz.id,
                    rz.name,
                    rz.area_hectares,
                    rz.latitude,
                    rz.longitude,
                    rz.status,
                    rz.created_at,
                    m.id AS mine_id,
                    m.name AS mine_name
             FROM rehabilitation_zones rz
             JOIN mines m ON m.id = rz.mine_id
             ORDER BY rz.name ASC`
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get zones error:", err);
        res.status(500).json({
            error: "Failed to fetch zones"
        });
    }
}

// GET /api/zones/:id
async function getZoneById(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT rz.id,
                    rz.name,
                    rz.area_hectares,
                    rz.latitude,
                    rz.longitude,
                    rz.status,
                    rz.created_at,
                    m.id AS mine_id,
                    m.name AS mine_name,
                    m.registration_number
             FROM rehabilitation_zones rz
             JOIN mines m ON m.id = rz.mine_id
             WHERE rz.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Zone not found"
            });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get zone error:", err);
        res.status(500).json({
            error: "Failed to fetch zone"
        });
    }
}

// POST /api/mines/:mineId/zones
// ADMIN OR MINE USER BELONGING TO THAT MINE
async function createZone(req, res) {
    const { mineId } = req.params;

    const {
        name,
        areaHectares,
        latitude,
        longitude,
        status
    } = req.body;

    if (!name) {
        return res.status(400).json({
            error: "Zone name is required"
        });
    }

    // MINE users can only create zones for their own mine
    if (
        req.user.role === "MINE" &&
        Number(req.user.mineId) !== Number(mineId)
    ) {
        return res.status(403).json({
            error: "You can only manage zones belonging to your mine"
        });
    }

    try {
        // Make sure the mine exists
        const mine = await pool.query(
            `SELECT id FROM mines WHERE id = $1`,
            [mineId]
        );

        if (mine.rows.length === 0) {
            return res.status(404).json({
                error: "Mine not found"
            });
        }

        const result = await pool.query(
            `INSERT INTO rehabilitation_zones
                (mine_id, name, area_hectares, latitude, longitude, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id,
                       mine_id,
                       name,
                       area_hectares,
                       latitude,
                       longitude,
                       status,
                       created_at`,
            [
                mineId,
                name,
                areaHectares || null,
                latitude || null,
                longitude || null,
                status || "ACTIVE"
            ]
        );

        res.status(201).json({
            message: "Rehabilitation zone created successfully",
            zone: result.rows[0]
        });
    } catch (err) {
        console.error("Create zone error:", err);

        res.status(500).json({
            error: "Failed to create rehabilitation zone"
        });
    }
}

// PUT /api/zones/:id
// ADMIN OR MINE USER BELONGING TO THE ZONE'S MINE
async function updateZone(req, res) {
    const { id } = req.params;

    const {
        name,
        areaHectares,
        latitude,
        longitude,
        status
    } = req.body;

    if (!name) {
        return res.status(400).json({
            error: "Zone name is required"
        });
    }

    try {
        const existingZone = await pool.query(
            `SELECT id, mine_id
             FROM rehabilitation_zones
             WHERE id = $1`,
            [id]
        );

        if (existingZone.rows.length === 0) {
            return res.status(404).json({
                error: "Zone not found"
            });
        }

        const zoneMineId = existingZone.rows[0].mine_id;

        // MINE users can only modify zones belonging to their mine
        if (
            req.user.role === "MINE" &&
            Number(req.user.mineId) !== Number(zoneMineId)
        ) {
            return res.status(403).json({
                error: "You can only manage zones belonging to your mine"
            });
        }

        const result = await pool.query(
            `UPDATE rehabilitation_zones
             SET name = $1,
                 area_hectares = $2,
                 latitude = $3,
                 longitude = $4,
                 status = $5
             WHERE id = $6
             RETURNING id,
                       mine_id,
                       name,
                       area_hectares,
                       latitude,
                       longitude,
                       status,
                       created_at`,
            [
                name,
                areaHectares || null,
                latitude || null,
                longitude || null,
                status || "ACTIVE",
                id
            ]
        );

        res.json({
            message: "Rehabilitation zone updated successfully",
            zone: result.rows[0]
        });
    } catch (err) {
        console.error("Update zone error:", err);

        res.status(500).json({
            error: "Failed to update rehabilitation zone"
        });
    }
}

// DELETE /api/zones/:id
// ADMIN OR MINE USER BELONGING TO THE ZONE'S MINE
async function deleteZone(req, res) {
    const { id } = req.params;

    try {
        const existingZone = await pool.query(
            `SELECT id, mine_id
             FROM rehabilitation_zones
             WHERE id = $1`,
            [id]
        );

        if (existingZone.rows.length === 0) {
            return res.status(404).json({
                error: "Zone not found"
            });
        }

        const zoneMineId = existingZone.rows[0].mine_id;

        // MINE users can only delete zones belonging to their mine
        if (
            req.user.role === "MINE" &&
            Number(req.user.mineId) !== Number(zoneMineId)
        ) {
            return res.status(403).json({
                error: "You can only manage zones belonging to your mine"
            });
        }

        const result = await pool.query(
            `DELETE FROM rehabilitation_zones
             WHERE id = $1
             RETURNING id, name, mine_id`,
            [id]
        );

        res.json({
            message: "Rehabilitation zone deleted successfully",
            zone: result.rows[0]
        });
    } catch (err) {
        console.error("Delete zone error:", err);

        res.status(500).json({
            error: "Failed to delete rehabilitation zone"
        });
    }
}

module.exports = {
    getAllZones,
    getZoneById,
    createZone,
    updateZone,
    deleteZone
};