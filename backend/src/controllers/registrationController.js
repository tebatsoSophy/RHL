const crypto = require("crypto");
const bcrypt = require("bcrypt");

const pool = require("../config/db");

const {
    sendRegistrationInvitation
} = require("../services/emailService");


// ============================================================
// 1. APPLICANT SUBMITS REGISTRATION REQUEST
// ============================================================

const createRegistrationRequest = async (req, res) => {
    try {
        const {
            name,
            email,
            requestedRole,
            requestedMineId,
            reason
        } = req.body;

        if (!name || !email || !requestedRole) {
            return res.status(400).json({
                message:
                    "Name, email and requested role are required"
            });
        }

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

        const normalizedEmail =
            email.toLowerCase().trim();

        // Check if account already exists
        const existingUser = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message:
                    "An account with this email already exists"
            });
        }

        // Check for existing pending request
        const existingRequest = await pool.query(
            `SELECT id
             FROM registration_requests
             WHERE email = $1
             AND status = 'PENDING'`,
            [normalizedEmail]
        );

        if (existingRequest.rows.length > 0) {
            return res.status(409).json({
                message:
                    "A registration request is already pending"
            });
        }

        // MINE users must belong to a mine
        if (
            requestedRole === "MINE" &&
            !requestedMineId
        ) {
            return res.status(400).json({
                message:
                    "A mine is required for mine registration"
            });
        }

        // If mine supplied, check that it exists
        if (requestedMineId) {
            const mine = await pool.query(
                `SELECT id
                 FROM mines
                 WHERE id = $1`,
                [requestedMineId]
            );

            if (mine.rows.length === 0) {
                return res.status(404).json({
                    message: "Mine not found"
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO registration_requests
            (
                name,
                email,
                requested_role,
                requested_mine_id,
                reason,
                status
            )
            VALUES ($1, $2, $3, $4, $5, 'PENDING')
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
                name.trim(),
                normalizedEmail,
                requestedRole,
                requestedMineId || null,
                reason?.trim() || null
            ]
        );

        return res.status(201).json({
            message:
                "Registration request submitted successfully",

            request: result.rows[0]
        });

    } catch (error) {
        console.error(
            "Registration request error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ============================================================
// 2. ADMIN VIEWS REGISTRATION REQUESTS
// ============================================================

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

        return res.json({
            requests: result.rows
        });

    } catch (error) {
        console.error(
            "Get registration requests error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ============================================================
// 3. ADMIN APPROVES REGISTRATION
// ============================================================

const approveRegistrationRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM registration_requests
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Registration request not found"
            });
        }

        const request = result.rows[0];

        if (request.status !== "PENDING") {
            return res.status(400).json({
                message:
                    `Request has already been ${request.status.toLowerCase()}`
            });
        }

        // ----------------------------------------------------
        // Generate secure invitation token
        // ----------------------------------------------------

        const rawToken =
            crypto.randomBytes(32).toString("hex");

        const hashedToken =
            crypto
                .createHash("sha256")
                .update(rawToken)
                .digest("hex");

        // ----------------------------------------------------
        // Generate 6-digit OTP
        // ----------------------------------------------------

        const otp =
            crypto
                .randomInt(100000, 1000000)
                .toString();

        const otpHash =
            await bcrypt.hash(otp, 10);

        // ----------------------------------------------------
        // Invitation expires in 24 hours
        // ----------------------------------------------------

        const tokenExpiresAt =
            new Date(
                Date.now() +
                24 * 60 * 60 * 1000
            );

        // ----------------------------------------------------
        // Create invitation link
        // ----------------------------------------------------

        const invitationLink =
            `${process.env.FRONTEND_URL}/complete-registration?token=${rawToken}`;

        // ----------------------------------------------------
        // Send email
        // ----------------------------------------------------

        await sendRegistrationInvitation({
            name: request.name,
            email: request.email,
            invitationLink,
            otp
        });

        // ----------------------------------------------------
        // Only mark APPROVED after email succeeds
        // ----------------------------------------------------

        await pool.query(
            `UPDATE registration_requests
             SET
                status = 'APPROVED',
                approval_token = $1,
                otp_hash = $2,
                token_expires_at = $3,
                reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [
                hashedToken,
                otpHash,
                tokenExpiresAt,
                id
            ]
        );

        return res.json({
            message:
                "Registration approved and invitation email sent"
        });

    } catch (error) {
        console.error(
            "Approve registration error:",
            error
        );

        return res.status(500).json({
            message:
                "Registration approval failed. The invitation email may not have been sent."
        });
    }
};


// ============================================================
// 4. VERIFY INVITATION TOKEN
// ============================================================

const verifyRegistrationToken = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                message:
                    "Registration token is required"
            });
        }

        const hashedToken =
            crypto
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
                message:
                    "Invalid registration link"
            });
        }

        const request = result.rows[0];

        if (request.status !== "APPROVED") {
            return res.status(400).json({
                message:
                    "This registration link is no longer valid"
            });
        }

        if (
            new Date() >
            new Date(request.token_expires_at)
        ) {
            return res.status(400).json({
                message:
                    "This registration link has expired"
            });
        }

        return res.json({
            message:
                "Registration link is valid",

            registration: {
                name: request.name,
                email: request.email,
                role: request.requested_role,
                mineId: request.requested_mine_id
            }
        });

    } catch (error) {
        console.error(
            "Verify registration token error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ============================================================
// 5. COMPLETE REGISTRATION
// ============================================================

const completeRegistration = async (req, res) => {
    try {
        const {
            token,
            otp,
            password
        } = req.body;

        if (!token || !otp || !password) {
            return res.status(400).json({
                message:
                    "Invitation token, OTP and password are required"
            });
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                message:
                    "OTP must be 6 digits"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters"
            });
        }

        const hashedToken =
            crypto
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
                message:
                    "Invalid registration link"
            });
        }

        const request = result.rows[0];

        if (request.status !== "APPROVED") {
            return res.status(400).json({
                message:
                    "This registration link is no longer valid"
            });
        }

        if (
            new Date() >
            new Date(request.token_expires_at)
        ) {
            return res.status(400).json({
                message:
                    "This registration link has expired"
            });
        }

        // ----------------------------------------------------
        // Check OTP
        // ----------------------------------------------------

        const validOtp =
            await bcrypt.compare(
                otp,
                request.otp_hash
            );

        if (!validOtp) {
            return res.status(401).json({
                message: "Invalid OTP"
            });
        }

        // ----------------------------------------------------
        // Make sure account doesn't already exist
        // ----------------------------------------------------

        const existingUser =
            await pool.query(
                `SELECT id
                 FROM users
                 WHERE email = $1`,
                [request.email]
            );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message:
                    "An account with this email already exists"
            });
        }

        // ----------------------------------------------------
        // Hash password
        // ----------------------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );

        // ----------------------------------------------------
        // Create user
        // ----------------------------------------------------

        const newUser =
            await pool.query(
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

        // ----------------------------------------------------
        // Invalidate invitation
        // ----------------------------------------------------

        await pool.query(
            `UPDATE registration_requests
             SET
                status = 'COMPLETED',
                approval_token = NULL,
                otp_hash = NULL,
                token_expires_at = NULL
             WHERE id = $1`,
            [request.id]
        );

        return res.status(201).json({
            message:
                "Account created successfully",

            user: newUser.rows[0]
        });

    } catch (error) {
        console.error(
            "Complete registration error:",
            error
        );

        return res.status(500).json({
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