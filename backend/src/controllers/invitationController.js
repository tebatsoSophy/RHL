const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const {
    sendInvitationEmail
} = require("../services/emailService");

const createInvitation = async (req, res) => {
    try {

        const { email, companyId, zoneId } = req.body;

        if (!email || !companyId || !zoneId) {
            return res.status(400).json({
                message: "Email, company and zone are required"

const pool = require("../config/db");

const {
    sendRegistrationInvitation
} = require("../services/emailService");


// ==========================================
// ADMIN: SEND USER INVITATION
// ==========================================
const createInvitation = async (req, res) => {
    try {
        const {
            name,
            email,
            role,
            mineId
        } = req.body;

        // ------------------------------
        // Validate required fields
        // ------------------------------
        if (!name || !email || !role) {
            return res.status(400).json({
                message: "Name, email and role are required"
            });
        }

        // ------------------------------
        // Validate role
        // ------------------------------
        const allowedRoles = [
            "MINE",
            "SPECIALIST",
            "REGULATOR"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid role"
            });
        }

        const normalizedEmail = email
            .toLowerCase()
            .trim();

        // Verify the zone belongs to the admin's mine
        const zoneResult = await pool.query(
            `SELECT
                rz.id,
                rz.name,
                m.id AS mine_id,
                m.name AS mine_name
             FROM rehabilitation_zones rz
             JOIN mines m
               ON m.id = rz.mine_id
             WHERE rz.id = $1
               AND rz.mine_id = $2`,
            [zoneId, req.user.mineId]
        );

        if (zoneResult.rows.length === 0) {
            return res.status(404).json({
                message: "Zone not found or not part of your mine"
            });
        }

        const zone = zoneResult.rows[0];

        // Verify company
        const companyResult = await pool.query(
            `SELECT id, name
             FROM companies
             WHERE id = $1`,
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                message: "Company not found"
            });
        }

        // Check whether user already exists
        const existingUser = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "A user with this email already exists"
            });
        }

        // Generate invitation token
        // ------------------------------
        // Check if account already exists
        // ------------------------------
        const existingUser = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        // ------------------------------
        // Mine required for MINE users
        // ------------------------------
        if (role === "MINE" && !mineId) {
            return res.status(400).json({
                message: "A mine is required for MINE users"
            });
        }

        // ------------------------------
        // Validate mine
        // ------------------------------
        if (mineId) {
            const mine = await pool.query(
                `SELECT id
                 FROM mines
                 WHERE id = $1`,
                [mineId]
            );

            if (mine.rows.length === 0) {
                return res.status(404).json({
                    message: "Mine not found"
                });
            }
        }

        // ------------------------------
        // Check for existing invitation
        // ------------------------------
        const existingInvitation = await pool.query(
            `SELECT id
             FROM invitations
             WHERE email = $1
             AND status = 'PENDING'
             AND token_expires_at > CURRENT_TIMESTAMP`,
            [normalizedEmail]
        );

        if (existingInvitation.rows.length > 0) {
            return res.status(409).json({
                message:
                    "An active invitation already exists for this email"
            });
        }

        // ------------------------------
        // Generate secure invitation token
        // ------------------------------
        const rawToken = crypto
            .randomBytes(32)
            .toString("hex");

        const tokenHash = crypto
        const hashedToken = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        // Generate OTP
        const otp = crypto.randomInt(
            100000,
            1000000
        ).toString();

        const otpHash = await bcrypt.hash(
            otp,
            12
        );

        const expiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        );

        const result = await pool.query(
            `INSERT INTO invitations
            (
                email,
                role,
                mine_id,
                company_id,
                zone_id,
                invited_by,
                invitation_token_hash,
                otp_hash,
                expires_at
            )
            VALUES
            ($1, 'WORKER', $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, email, zone_id, expires_at`,
            [
                normalizedEmail,
                req.user.mineId,
                companyId,
                zoneId,
                req.user.userId,
                tokenHash,
                otpHash,
                expiresAt
            ]
        );

        const invitationLink =
            `${process.env.FRONTEND_URL}/accept-invitation?token=${rawToken}`;

        await sendInvitationEmail({
            email: normalizedEmail,
            invitationLink,
            otp,
            mineName: zone.mine_name,
            zoneName: zone.name
        });

        return res.status(201).json({
            message: "Invitation sent successfully",
        // ------------------------------
        // Generate 6-digit OTP
        // ------------------------------
        const otp = crypto
            .randomInt(100000, 1000000)
            .toString();

        const otpHash = await bcrypt.hash(
            otp,
            10
        );

        // ------------------------------
        // Invitation expires in 24 hours
        // ------------------------------
        const tokenExpiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        );

        // ------------------------------
        // Invitation link
        // ------------------------------
        const invitationLink =
            `${process.env.FRONTEND_URL}/complete-registration?token=${rawToken}`;

        // ------------------------------
        // Store invitation
        // ------------------------------
        const result = await pool.query(
            `INSERT INTO invitations
            (
                name,
                email,
                role,
                mine_id,
                invitation_token,
                otp_hash,
                token_expires_at,
                status
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                'PENDING'
            )
            RETURNING
                id,
                name,
                email,
                role,
                mine_id,
                status,
                token_expires_at,
                created_at`,
            [
                name.trim(),
                normalizedEmail,
                role,
                mineId || null,
                hashedToken,
                otpHash,
                tokenExpiresAt
            ]
        );

        // ------------------------------
        // Send invitation email
        // ------------------------------
        await sendRegistrationInvitation({
            name: name.trim(),
            email: normalizedEmail,
            invitationLink,
            otp
        });

        return res.status(201).json({
            message:
                "Invitation sent successfully",
            invitation: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Create invitation error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

            message:
                "Failed to send invitation"
        });
    }
};


module.exports = {
    createInvitation
};