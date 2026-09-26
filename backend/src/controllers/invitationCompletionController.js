const crypto = require("crypto");
const bcrypt = require("bcrypt");

const pool = require("../config/db");


// ==========================================
// VERIFY INVITATION TOKEN + OTP
// ==========================================
const verifyInvitation = async (req, res) => {
    try {
        const { token, otp } = req.body;

        if (!token || !otp) {
            return res.status(400).json({
                message: "Invitation token and OTP are required"
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
                role,
                mine_id,
                otp_hash,
                status,
                token_expires_at
             FROM invitations
             WHERE invitation_token = $1`,
            [hashedToken]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "Invalid invitation"
            });
        }

        const invitation = result.rows[0];

        if (invitation.status !== "PENDING") {
            return res.status(400).json({
                message: "This invitation is no longer active"
            });
        }

        if (
            new Date(invitation.token_expires_at) < new Date()
        ) {
            return res.status(400).json({
                message: "This invitation has expired"
            });
        }

        const otpMatch = await bcrypt.compare(
            otp,
            invitation.otp_hash
        );

        if (!otpMatch) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        return res.json({
            message: "Invitation verified",
            invitation: {
                id: invitation.id,
                name: invitation.name,
                email: invitation.email,
                role: invitation.role,
                mineId: invitation.mine_id
            }
        });

    } catch (error) {
        console.error(
            "Verify invitation error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==========================================
// COMPLETE REGISTRATION
// ==========================================
const completeInvitation = async (req, res) => {
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

        if (password.length < 8) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters"
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const invitationResult = await pool.query(
            `SELECT
                id,
                name,
                email,
                role,
                mine_id,
                otp_hash,
                status,
                token_expires_at
             FROM invitations
             WHERE invitation_token = $1`,
            [hashedToken]
        );

        if (invitationResult.rows.length === 0) {
            return res.status(400).json({
                message: "Invalid invitation"
            });
        }

        const invitation = invitationResult.rows[0];

        if (invitation.status !== "PENDING") {
            return res.status(400).json({
                message: "This invitation is no longer active"
            });
        }

        if (
            new Date(invitation.token_expires_at) < new Date()
        ) {
            return res.status(400).json({
                message: "This invitation has expired"
            });
        }

        const otpMatch = await bcrypt.compare(
            otp,
            invitation.otp_hash
        );

        if (!otpMatch) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        const existingUser = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1`,
            [invitation.email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message:
                    "An account with this email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        const userResult = await pool.query(
            `INSERT INTO users
            (
                name,
                email,
                password,
                role,
                mine_id
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5
            )
            RETURNING
                id,
                name,
                email,
                role,
                mine_id`,
            [
                invitation.name,
                invitation.email,
                passwordHash,
                invitation.role,
                invitation.mine_id
            ]
        );

        await pool.query(
            `UPDATE invitations
             SET
                status = 'COMPLETED',
                completed_at = CURRENT_TIMESTAMP,
                invitation_token = NULL,
                otp_hash = NULL
             WHERE id = $1`,
            [invitation.id]
        );

        return res.status(201).json({
            message:
                "Registration completed successfully",
            user: userResult.rows[0]
        });

    } catch (error) {
        console.error(
            "Complete invitation error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


module.exports = {
    verifyInvitation,
    completeInvitation
};