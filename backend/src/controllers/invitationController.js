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

const VALID_INVITE_ROLES = ["WORKER", "SPECIALIST", "REGULATOR"];

const createInvitation = async (req, res) => {
    try {

        const {
            email,
            companyId,
            zoneId,
            role
        } = req.body;

        if (!email || !zoneId || !role) {
            return res.status(400).json({
                message: "Email, zone, and role are required"
            });
        }

        if (!VALID_INVITE_ROLES.includes(role)) {
            return res.status(400).json({
                message: `Role must be one of: ${VALID_INVITE_ROLES.join(", ")}`
            });
        }

        // Company is required for Worker/Specialist (they're contractor staff),
        // optional for Regulator (often a government body, not tied to a company)
        if (role !== "REGULATOR" && !companyId) {
            return res.status(400).json({
                message: "Company is required for this role"
            });
        }

        const normalizedEmail =
            email.toLowerCase().trim();


        // ----------------------------------------------------
        // Verify zone belongs to admin's mine
        // ----------------------------------------------------

        const zoneResult = await pool.query(
            `
            SELECT
                rz.id,
                rz.name,
                m.id AS mine_id,
                m.name AS mine_name
            FROM rehabilitation_zones rz
            JOIN mines m
                ON m.id = rz.mine_id
            WHERE rz.id = $1
              AND rz.mine_id = $2
            `,
            [
                zoneId,
                req.user.mineId
            ]
        );

        if (zoneResult.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Zone not found or not part of your mine"
            });
        }

        const zone = zoneResult.rows[0];


        // ----------------------------------------------------
        // Verify company (only if one was provided)
        // ----------------------------------------------------

        if (companyId) {
            const companyResult = await pool.query(
                `SELECT id, name FROM companies WHERE id = $1`,
                [companyId]
            );

            if (companyResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Company not found"
                });
            }
        }


        // ----------------------------------------------------
        // Check existing user
        // ----------------------------------------------------

        const existingUser = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "A user with this email already exists"
            });
        }


        // ----------------------------------------------------
        // Generate invitation token
        // ----------------------------------------------------

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");


        // ----------------------------------------------------
        // Generate 6 digit OTP
        // ----------------------------------------------------

        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 12);


        // ----------------------------------------------------
        // Expire after 24 hours
        // ----------------------------------------------------

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);


        // ----------------------------------------------------
        // Save invitation
        // ----------------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO invitations
            (
                email, role, mine_id, company_id, zone_id,
                invited_by, invitation_token_hash, otp_hash, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, email, role, zone_id, expires_at
            `,
            [
                normalizedEmail,
                role,
                req.user.mineId,
                companyId || null,
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
            invitation: result.rows[0]
        });

    } catch (error) {
        console.error("Create invitation error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ============================================================
// VERIFY INVITATION
// Used when worker opens the email link
// ============================================================

const verifyInvitation = async (req, res) => {
    try {

        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                message:
                    "Invitation token is required"
            });
        }


        // Hash token from URL
        const tokenHash =
            crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");


        const result = await pool.query(
            `
            SELECT
                i.id,
                i.email,
                i.status,
                i.expires_at,

                m.name AS mine_name,

                c.name AS company_name,

                rz.name AS zone_name

            FROM invitations i

            JOIN mines m
                ON m.id = i.mine_id

            LEFT JOIN companies c
                ON c.id = i.company_id

            JOIN rehabilitation_zones rz
                ON rz.id = i.zone_id

            WHERE i.invitation_token_hash = $1
            `,
            [tokenHash]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Invalid invitation link"
            });
        }


        const invitation =
            result.rows[0];


        // Already used
        if (invitation.status !== "PENDING") {
            return res.status(400).json({
                message:
                    "This invitation is no longer valid"
            });
        }


        // Expired
        if (
            new Date(invitation.expires_at)
            < new Date()
        ) {

            // Update database
            await pool.query(
                `
                UPDATE invitations
                SET status = 'EXPIRED'
                WHERE id = $1
                `,
                [invitation.id]
            );

            return res.status(400).json({
                message:
                    "This invitation has expired"
            });
        }


        return res.json({
            email: invitation.email,
            mineName: invitation.mine_name,
            companyName:
                invitation.company_name,
            zoneName:
                invitation.zone_name
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


        // ----------------------------------------------------
        // Basic validation
        // ----------------------------------------------------

        if (
            !token ||
            !otp ||
            !name ||
            !password
        ) {

            return res.status(400).json({
                message:
                    "Token, OTP, name and password are required"
            });
        }


        if (name.trim().length < 2) {
            return res.status(400).json({
                message:
                    "Please enter a valid name"
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


        // ----------------------------------------------------
        // Hash invitation token
        // ----------------------------------------------------

        const tokenHash =
            crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");


        // ----------------------------------------------------
        // Start transaction
        // ----------------------------------------------------

        await client.query("BEGIN");


        // Lock invitation while processing
        const invitationResult =
            await client.query(
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
                message:
                    "Invalid invitation"
            });
        }


        const invitation =
            invitationResult.rows[0];


        // ----------------------------------------------------
        // Check invitation status
        // ----------------------------------------------------

        if (invitation.status !== "PENDING") {

            await client.query("ROLLBACK");

            return res.status(400).json({
                message:
                    "This invitation has already been used"
            });
        }


        // ----------------------------------------------------
        // Check expiry
        // ----------------------------------------------------

        if (
            new Date(invitation.expires_at)
            < new Date()
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
                message:
                    "This invitation has expired"
            });
        }


        // ----------------------------------------------------
        // Verify OTP
        // ----------------------------------------------------

        const otpValid =
            await bcrypt.compare(
                otp,
                invitation.otp_hash
            );


        if (!otpValid) {

            await client.query("ROLLBACK");

            return res.status(401).json({
                message:
                    "Invalid OTP"
            });
        }


        // ----------------------------------------------------
        // Check email hasn't been registered
        // ----------------------------------------------------

        const existingUser =
            await client.query(
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


        // ----------------------------------------------------
        // Hash password
        // ----------------------------------------------------

        const passwordHash =
            await bcrypt.hash(password, 12);


        // ----------------------------------------------------
        // Create WORKER account
        // ----------------------------------------------------

        const userResult =
            await client.query(
                `
                INSERT INTO users
                (
                    name,
                    email,
                    password,
                    role,
                    company_id
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $5,
                    $5
                )
                RETURNING
                    id,
                    name,
                    email,
                    role,
                    company_id
                `,
                [
                    name.trim(),
                    invitation.email,
                    passwordHash,
                    invitation.role,
                    invitation.company_id
                ]
            );


        const user =
            userResult.rows[0];


        // ----------------------------------------------------
        // Assign worker to rehabilitation zone
        // ----------------------------------------------------

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
            `,
            [
                user.id,
                invitation.zone_id,
                invitation.invited_by
            ]
        );


        // ----------------------------------------------------
        // Mark invitation accepted
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Commit everything
        // ----------------------------------------------------

        await client.query("COMMIT");


        // ----------------------------------------------------
        // Automatically log worker in
        // ----------------------------------------------------

        const jwtToken =
            jwt.sign(
                {
                    userId: user.id,
                    role: user.role,
                    mineId: null,
                    companyId:
                        user.company_id
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "8h"
                }
            );


        return res.status(201).json({

            message:
                "Account created successfully",

            token: jwtToken,

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId:
                    user.company_id
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


const getMyInvitations = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                i.id, i.email, i.role, i.status, i.expires_at, i.created_at,
                rz.name AS zone_name,
                c.name AS company_name
            FROM invitations i
            JOIN rehabilitation_zones rz ON rz.id = i.zone_id
            LEFT JOIN companies c ON c.id = i.company_id
            WHERE i.mine_id = $1
            ORDER BY i.created_at DESC
            `,
            [req.user.mineId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Get invitations error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    createInvitation,
    verifyInvitation,
    acceptInvitation,
    getMyInvitations   
};