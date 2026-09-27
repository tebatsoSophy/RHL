const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const {
    sendInvitationEmail
} = require("../services/emailService");


// ============================================================
// CREATE INVITATION
// ============================================================

const createInvitation = async (req, res) => {
    try {
        const {
              name,
            email,
            role,
            mineId,
            companyId,
            zoneId
        } = req.body;

        if (!email || !role || !mineId || !zoneId) {
            return res.status(400).json({
                message: "Email, role, mine and zone are required"
            });
        }

        const allowedRoles = [
            "WORKER",
            "SPECIALIST",
            "REGULATOR"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid invitation role"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await pool.query(
            `
            SELECT id
            FROM users
            WHERE email = $1
            `,
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        const mineResult = await pool.query(
            `
            SELECT id, name
            FROM mines
            WHERE id = $1
            `,
            [mineId]
        );

        if (mineResult.rows.length === 0) {
            return res.status(404).json({
                message: "Mine not found"
            });
        }

        if (companyId) {
            const companyResult = await pool.query(
                `
                SELECT id, name
                FROM companies
                WHERE id = $1
                `,
                [companyId]
            );

            if (companyResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Company not found"
                });
            }
        }

        const zoneResult = await pool.query(
            `
            SELECT
                rz.id,
                rz.name,
                rz.mine_id,
                m.name AS mine_name
            FROM rehabilitation_zones rz
            JOIN mines m
                ON m.id = rz.mine_id
            WHERE rz.id = $1
            `,
            [zoneId]
        );

        if (zoneResult.rows.length === 0) {
            return res.status(404).json({
                message: "Zone not found"
            });
        }

        const zone = zoneResult.rows[0];

        if (Number(zone.mine_id) !== Number(mineId)) {
            return res.status(400).json({
                message: "Zone does not belong to the selected mine"
            });
        }

        const existingInvitation = await pool.query(
            `
            SELECT id
            FROM invitations
            WHERE email = $1
              AND status = 'PENDING'
              AND expires_at > CURRENT_TIMESTAMP
            `,
            [normalizedEmail]
        );

        if (existingInvitation.rows.length > 0) {
            return res.status(409).json({
                message: "An active invitation already exists for this email"
            });
        }

        const rawToken = crypto
            .randomBytes(32)
            .toString("hex");

        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const otp = crypto
            .randomInt(100000, 1000000)
            .toString();

        const otpHash = await bcrypt.hash(
            otp,
            12
        );

        const expiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        );

        const result = await pool.query(
            `
            INSERT INTO invitations
            (
                  name,
                email,
                role,
                mine_id,
                company_id,
                zone_id,
                invited_by,
                invitation_token_hash,
                otp_hash,
                expires_at,
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
                $8,
                $9,
                $10,
                'PENDING'
            )
            RETURNING
                id,
                 name,
                email,
                role,
                mine_id,
                company_id,
                zone_id,
                invited_by,
                status,
                expires_at,
                created_at
            `,
            [
                name.trim(),
                normalizedEmail,
                role,
                mineId,
                companyId || null,
                zoneId,
                req.user.id,
                tokenHash,
                otpHash,
                expiresAt
            ]
        );

        const invitationLink =
            `${process.env.FRONTEND_URL}/complete-registration?token=${rawToken}`;

        await sendInvitationEmail({
            name: normalizedEmail,
            email: normalizedEmail,
            invitationLink,
            otp,
            mineName: zone.mine_name,
            zoneName: zone.name
        });

        return res.status(201).json({
            message: "Invitation sent successfully",
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


// ============================================================
// VERIFY INVITATION
// ============================================================

const verifyInvitation = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                message: "Invitation token is required"
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const result = await pool.query(
            `
            SELECT
                i.id,
                i.email,
                i.role,
                i.status,
                i.expires_at,
                m.name AS mine_name,
                c.name AS company_name,
                rz.name AS zone_name
            FROM invitations i
            LEFT JOIN mines m
                ON m.id = i.mine_id
            LEFT JOIN companies c
                ON c.id = i.company_id
            LEFT JOIN rehabilitation_zones rz
                ON rz.id = i.zone_id
            WHERE i.invitation_token_hash = $1
            `,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Invalid invitation link"
            });
        }

        const invitation = result.rows[0];

        if (invitation.status !== "PENDING") {
            return res.status(400).json({
                message: "This invitation is no longer valid"
            });
        }

        if (
            new Date(invitation.expires_at) < new Date()
        ) {
            await pool.query(
                `
                UPDATE invitations
                SET status = 'EXPIRED'
                WHERE id = $1
                `,
                [invitation.id]
            );

            return res.status(400).json({
                message: "This invitation has expired"
            });
        }

        return res.json({
            email: invitation.email,
            role: invitation.role,
            mineName: invitation.mine_name,
            companyName: invitation.company_name,
            zoneName: invitation.zone_name
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


// ============================================================
// ACCEPT INVITATION
// ============================================================

const acceptInvitation = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            token,
            otp,
            name,
            password
        } = req.body;

        if (!token || !otp || !name || !password) {
            return res.status(400).json({
                message:
                    "Token, OTP, name and password are required"
            });
        }

        if (name.trim().length < 2) {
            return res.status(400).json({
                message: "Please enter a valid name"
            });
        }

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                message: "OTP must be 6 digits"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        await client.query("BEGIN");

        const invitationResult = await client.query(
            `
            SELECT *
            FROM invitations
            WHERE invitation_token_hash = $1
            FOR UPDATE
            `,
            [tokenHash]
        );

        if (invitationResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Invalid invitation"
            });
        }

        const invitation = invitationResult.rows[0];

        if (invitation.status !== "PENDING") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "This invitation has already been used"
            });
        }

        if (
            new Date(invitation.expires_at) < new Date()
        ) {
            await client.query(
                `
                UPDATE invitations
                SET status = 'EXPIRED'
                WHERE id = $1
                `,
                [invitation.id]
            );

            await client.query("COMMIT");

            return res.status(400).json({
                message: "This invitation has expired"
            });
        }

        const otpValid = await bcrypt.compare(
            otp,
            invitation.otp_hash
        );

        if (!otpValid) {
            await client.query("ROLLBACK");

            return res.status(401).json({
                message: "Invalid OTP"
            });
        }

        const existingUser = await client.query(
            `
            SELECT id
            FROM users
            WHERE email = $1
            `,
            [invitation.email]
        );

        if (existingUser.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message:
                    "An account with this email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        const userResult = await client.query(
            `
            INSERT INTO users
            (
                name,
                email,
                password,
                role,
                mine_id,
                company_id
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6
            )
            RETURNING
                id,
                name,
                email,
                role,
                mine_id,
                company_id
            `,
            [
                name.trim(),
                invitation.email,
                passwordHash,
                invitation.role,
                invitation.mine_id,
                invitation.company_id
            ]
        );

        const user = userResult.rows[0];

        if (invitation.zone_id) {
            await client.query(
                `
                INSERT INTO zone_assignments
                (
                    user_id,
                    zone_id,
                    assigned_by
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                ON CONFLICT (user_id, zone_id)
                DO NOTHING
                `,
                [
                    user.id,
                    invitation.zone_id,
                    invitation.invited_by
                ]
            );
        }

        await client.query(
            `
            UPDATE invitations
            SET
                status = 'ACCEPTED',
                accepted_at = CURRENT_TIMESTAMP,
                accepted_user_id = $1
            WHERE id = $2
            `,
            [
                user.id,
                invitation.id
            ]
        );

        await client.query("COMMIT");

        const jwtToken = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                mineId: user.mine_id,
                companyId: user.company_id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        return res.status(201).json({
            message: "Account created successfully",
            token: jwtToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                mineId: user.mine_id,
                companyId: user.company_id
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Accept invitation error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });

    } finally {
        client.release();
    }
};


// ============================================================
// GET MY INVITATIONS
// ============================================================

const getMyInvitations = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                i.id,
                i.email,
                i.role,
                i.status,
                i.expires_at,
                i.created_at,
                i.accepted_at,
                rz.name AS zone_name,
                c.name AS company_name,
                m.name AS mine_name
            FROM invitations i
            LEFT JOIN rehabilitation_zones rz
                ON rz.id = i.zone_id
            LEFT JOIN companies c
                ON c.id = i.company_id
            LEFT JOIN mines m
                ON m.id = i.mine_id
            WHERE i.mine_id = $1
            ORDER BY i.created_at DESC
            `,
            [req.user.mineId]
        );

        return res.json(result.rows);

    } catch (error) {
        console.error(
            "Get invitations error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    createInvitation,
    verifyInvitation,
    acceptInvitation,
    getMyInvitations
};