const pool = require("../config/db");

// GET /api/mines
async function getAllMines(req, res) {
    try {
        const result = await pool.query(
            `SELECT id, name, registration_number, location, created_at
             FROM mines
             ORDER BY name ASC`
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Get mines error:", err);
        res.status(500).json({
            error: "Failed to fetch mines"
        });
    }
}

// GET /api/mines/:id
async function getMineById(req, res) {
    const { id } = req.params;

    try {
        const mineResult = await pool.query(
            `SELECT id, name, registration_number, location, created_at
             FROM mines
             WHERE id = $1`,
            [id]
        );

        if (mineResult.rows.length === 0) {
            return res.status(404).json({
                error: "Mine not found"
            });
        }

        const zonesResult = await pool.query(
            `SELECT id,
                    name,
                    area_hectares,
                    latitude,
                    longitude,
                    status,
                    created_at
             FROM rehabilitation_zones
             WHERE mine_id = $1
             ORDER BY name ASC`,
            [id]
        );

        res.json({
            ...mineResult.rows[0],
            zones: zonesResult.rows
        });

    } catch (err) {
        console.error("Get mine error:", err);

        res.status(500).json({
            error: "Failed to fetch mine"
        });
    }
}

// POST /api/mines
// ADMIN ONLY
async function createMine(req, res) {
    const {
        name,
        registrationNumber,
        location
    } = req.body;

    if (!name || !registrationNumber) {
        return res.status(400).json({
            error: "Name and registration number are required"
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO mines
                (name, registration_number, location)
             VALUES ($1, $2, $3)
             RETURNING id,
                       name,
                       registration_number,
                       location,
                       created_at`,
            [
                name,
                registrationNumber,
                location || null
            ]
        );

        res.status(201).json({
            message: "Mine created successfully",
            mine: result.rows[0]
        });

    } catch (err) {
        console.error("Create mine error:", err);

        if (err.code === "23505") {
            return res.status(409).json({
                error: "Registration number already exists"
            });
        }

        res.status(500).json({
            error: "Failed to create mine"
        });
    }
}

// PUT /api/mines/:id
// ADMIN ONLY
async function updateMine(req, res) {
const { id } = req.params;


const {
    name,
    registrationNumber,
    location
} = req.body;

if (!name || !registrationNumber) {
    return res.status(400).json({
        error: "Name and registration number are required"
    });
}

// MINE users can only update their own mine
if (
    req.user.role === "MINE" &&
    Number(req.user.mineId) !== Number(id)
) {
    return res.status(403).json({
        error: "You can only manage your own mine"
    });
}

try {
    const result = await pool.query(
        `UPDATE mines
         SET name = $1,
             registration_number = $2,
             location = $3
         WHERE id = $4
         RETURNING id,
                   name,
                   registration_number,
                   location,
                   created_at`,
        [
            name,
            registrationNumber,
            location || null,
            id
        ]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: "Mine not found"
        });
    }

    res.json({
        message: "Mine updated successfully",
        mine: result.rows[0]
    });

} catch (err) {
    console.error("Update mine error:", err);

    if (err.code === "23505") {
        return res.status(409).json({
            error: "Registration number already exists"
        });
    }

    res.status(500).json({
        error: "Failed to update mine"
    });
}


}


// DELETE /api/mines/:id
// ADMIN ONLY
async function deleteMine(req, res) {
const { id } = req.params;

// MINE users can only delete their own mine
if (
    req.user.role === "MINE" &&
    Number(req.user.mineId) !== Number(id)
) {
    return res.status(403).json({
        error: "You can only manage your own mine"
    });
}

try {
    const result = await pool.query(
        `DELETE FROM mines
         WHERE id = $1
         RETURNING id, name`,
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: "Mine not found"
        });
    }

    res.json({
        message: "Mine deleted successfully",
        mine: result.rows[0]
    });

} catch (err) {
    console.error("Delete mine error:", err);

    res.status(500).json({
        error: "Failed to delete mine"
    });
}

}


module.exports = {
    getAllMines,
    getMineById,
    createMine,
    updateMine,
    deleteMine
};