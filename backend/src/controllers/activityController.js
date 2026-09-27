const pool = require("../config/db");

// POST /api/activities — worker logs a rehabilitation activity for one of their assigned zones
const createActivity = async (req, res) => {
    try {
        const {
            zoneId,
            activityType,
            description,
            measurement,
            unit,
            activityDate
        } = req.body;

        if (!zoneId || !activityType || !activityDate) {
            return res.status(400).json({
                message: "zoneId, activityType, and activityDate are required"
            });
        }

        // Confirm this worker is actually assigned to this zone
        const assignment = await pool.query(
            `
            SELECT 1 FROM zone_assignments
            WHERE user_id = $1 AND zone_id = $2 AND status = 'ACTIVE'
            `,
            [req.user.userId, zoneId]
        );

        if (assignment.rows.length === 0) {
            return res.status(403).json({
                message: "You are not assigned to this zone"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO rehabilitation_activities
                (zone_id, activity_type, description, measurement, unit, performed_by, activity_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            `,
            [zoneId, activityType, description || null, measurement || null, unit || null, req.user.userId, activityDate]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Create activity error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/activities/zone/:zoneId — worker views activities they've logged for one of their zones
const getZoneActivities = async (req, res) => {
    const { zoneId } = req.params;
    try {
        const assignment = await pool.query(
            `
            SELECT 1 FROM zone_assignments
            WHERE user_id = $1 AND zone_id = $2 AND status = 'ACTIVE'
            `,
            [req.user.userId, zoneId]
        );

        if (assignment.rows.length === 0) {
            return res.status(403).json({
                message: "You are not assigned to this zone"
            });
        }

        const result = await pool.query(
            `
            SELECT * FROM rehabilitation_activities
            WHERE zone_id = $1
            ORDER BY activity_date DESC
            `,
            [zoneId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Get zone activities error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { createActivity, getZoneActivities };