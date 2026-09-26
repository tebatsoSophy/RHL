const bcrypt = require("bcrypt");
const pool = require("../config/db");

const createUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            mineId
        } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "Name, email, password and role are required"
            });
        }

        const allowedRoles = [
            "MINE",
            "SPECIALIST",
            "REGULATOR"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid user role"
            });
        }

        if (role === "MINE" && !mineId) {
            return res.status(400).json({
                message: "A mine user must be assigned to a mine"
            });
        }

        // Check if email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "A user with this email already exists"
            });
        }

        // If a mine was supplied, make sure it exists
        if (mineId) {
            const mine = await pool.query(
                "SELECT id FROM mines WHERE id = $1",
                [mineId]
            );

            if (mine.rows.length === 0) {
                return res.status(404).json({
                    message: "Mine not found"
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        // Create user
        const result = await pool.query(
            `INSERT INTO users
            (name, email, password, role, mine_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, email, role, mine_id, created_at`,
            [
                name,
                email.toLowerCase(),
                hashedPassword,
                role,
                mineId || null
            ]
        );

        res.status(201).json({
            message: "User created successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Create user error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    createUser
};