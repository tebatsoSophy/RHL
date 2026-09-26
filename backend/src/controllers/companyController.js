const pool = require("../config/db");

const getAllCompanies = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, company_type FROM companies ORDER BY name ASC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Get companies error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getAllCompanies };