const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const createRegistrationRequest = async (req, res) => {
    try {
        const {
            name,
            email,
            requestedRole,
            requestedMineId,
            reason
        } = req.body;

        // Required fields
        if (!name || !email || !requestedRole) {
            return res.status(400).json({
                message: "Name, email and requested role are required"
            });
        }

        // Only these roles can be requested
        const allowedRoles = [
            "MINE",
            "SPECIALIST",
            "REGULATOR"
        ];

        if (!allowedRoles.includes(requestedRole)) {
            return res.status(400).json({
                message: "Invalid requested role"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check whether this email already has an account
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        // Check for an existing pending request
        const existingRequest = await pool.query(
            `SELECT id
             FROM registration_requests
             WHERE email = $1
             AND status = 'PENDING'`,
            [normalizedEmail]
        );

        if (existingRequest.rows.length > 0) {
            return res.status(409).json({
                message: "A registration request is already pending"
            });
        }

        // If requesting MINE access, a mine must be provided
        if (requestedRole === "MINE" && !requestedMineId) {
            return res.status(400).json({
                message: "A mine is required for mine registration"
            });
        }

        // If a mine was supplied, make sure it exists
        if (requestedMineId) {
            const mine = await pool.query(
                "SELECT id FROM mines WHERE id = $1",
                [requestedMineId]
            );

            if (mine.rows.length === 0) {
                return res.status(404).json({
                    message: "Mine not found"
                });
            }
        }

        // Create registration request
        const result = await pool.query(
            `INSERT INTO registration_requests
            (
                name,
                email,
                requested_role,
                requested_mine_id,
                reason
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING
                id,
                name,
                email,
                requested_role,
                requested_mine_id,
                reason,
                status,
                created_at`,
            [
                name,
                normalizedEmail,
                requestedRole,
                requestedMineId || null,
                reason || null
            ]
        );

        res.status(201).json({
            message: "Registration request submitted successfully",
            request: result.rows[0]
        });

    } catch (error) {
        console.error("Registration request error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const getRegistrationRequests = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                rr.id,
                rr.name,
                rr.email,
                rr.requested_role,
                rr.requested_mine_id,
                m.name AS mine_name,
                rr.reason,
                rr.status,
                rr.created_at,
                rr.reviewed_at
             FROM registration_requests rr
             LEFT JOIN mines m
                ON rr.requested_mine_id = m.id
             ORDER BY rr.created_at DESC`
        );

        res.json({
            requests: result.rows
        });

    } catch (error) {
        console.error("Get registration requests error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const approveRegistrationRequest = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the registration request
        const result = await pool.query(
            `SELECT *
             FROM registration_requests
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Registration request not found"
            });
        }

        const request = result.rows[0];

        if (request.status !== "PENDING") {
            return res.status(400).json({
                message: `Request has already been ${request.status.toLowerCase()}`
            });
        }

        // Generate secure invitation token
        const rawToken = crypto.randomBytes(32).toString("hex");

        // Hash token before storing it
        const hashedToken = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        // Invitation expires in 24 hours
        const tokenExpiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        );

        await pool.query(
            `UPDATE registration_requests
             SET
                status = 'APPROVED',
                approval_token = $1,
                token_expires_at = $2,
                reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [
                hashedToken,
                tokenExpiresAt,
                id
            ]
        );

        // Temporary link for development/testing
        const invitationLink =
            `http://localhost:3000/complete-registration?token=${rawToken}`;

        res.json({
            message: "Registration request approved",
            invitationLink,
            expiresAt: tokenExpiresAt
        });

    } catch (error) {
        console.error("Approve registration error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const verifyRegistrationToken = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                message: "Registration token is required"
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const result = await pool.query(
            `SELECT
                id,
                name,
                email,
                requested_role,
                requested_mine_id,
                status,
                token_expires_at
             FROM registration_requests
             WHERE approval_token = $1`,
            [hashedToken]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "Invalid registration link"
            });
        }

        const request = result.rows[0];

        if (request.status !== "APPROVED") {
            return res.status(400).json({
                message: "This registration link is no longer valid"
            });
        }

        if (new Date() > new Date(request.token_expires_at)) {
            return res.status(400).json({
                message: "This registration link has expired"
            });
        }

        res.json({
            message: "Registration link is valid",
            registration: {
                name: request.name,
                email: request.email,
                role: request.requested_role,
                mineId: request.requested_mine_id
            }
        });

    } catch (error) {
        console.error("Verify registration token error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


const completeRegistration = async (req, res) => {
    try {
        const {
            token,
            password
        } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                message: "Registration token and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const result = await pool.query(
            `SELECT *
             FROM registration_requests
             WHERE approval_token = $1`,
            [hashedToken]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "Invalid registration link"
            });
        }

        const request = result.rows[0];

        if (request.status !== "APPROVED") {
            return res.status(400).json({
                message: "This registration link is no longer valid"
            });
        }

        if (new Date() > new Date(request.token_expires_at)) {
            return res.status(400).json({
                message: "This registration link has expired"
            });
        }

        // Check that an account hasn't already been created
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [request.email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        const newUser = await pool.query(
            `INSERT INTO users
            (
                name,
                email,
                password,
                role,
                mine_id
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING
                id,
                name,
                email,
                role,
                mine_id,
                created_at`,
            [
                request.name,
                request.email,
                hashedPassword,
                request.requested_role,
                request.requested_mine_id
            ]
        );

        // Mark invitation as used
        await pool.query(
            `UPDATE registration_requests
             SET
                status = 'COMPLETED',
                approval_token = NULL,
                token_expires_at = NULL
             WHERE id = $1`,
            [request.id]
        );

        res.status(201).json({
            message: "Account created successfully",
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error("Complete registration error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};
module.exports = {
    createRegistrationRequest,
    getRegistrationRequests,
    approveRegistrationRequest,
    verifyRegistrationToken,
    completeRegistration
};