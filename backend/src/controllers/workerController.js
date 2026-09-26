const pool = require("../config/db");


const getMyZones = async (req, res) => {

    try {

        const result =
            await pool.query(
                `
                SELECT
                    rz.id,
                    rz.name,
                    rz.area_hectares,
                    rz.latitude,
                    rz.longitude,
                    rz.status,
                    m.name AS mine_name

                FROM zone_assignments za

                JOIN rehabilitation_zones rz
                    ON rz.id = za.zone_id

                JOIN mines m
                    ON m.id = rz.mine_id

                WHERE za.user_id = $1
                  AND za.status = 'ACTIVE'

                ORDER BY rz.name
                `,
                [req.user.userId]
            );


        return res.json({
            zones: result.rows
        });

    } catch (error) {

        console.error(
            "Get worker zones error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


module.exports = {
    getMyZones
};