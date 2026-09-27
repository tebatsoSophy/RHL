const crypto = require("crypto");
const pool = require("../config/db");
const supabase = require("../config/supabaseClient");

const BUCKET = "evidence";

// Strip anything that isn't a safe filename character — prevents path traversal in the storage key
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// POST /api/evidence/:activityId  (multipart/form-data, field name "file")
const uploadEvidence = async (req, res) => {
    try {
        const { activityId } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: "A file is required" });
        }

        // Confirm the activity exists and get its zone
        const activityResult = await pool.query(
            `SELECT id, zone_id FROM rehabilitation_activities WHERE id = $1`,
            [activityId]
        );

        if (activityResult.rows.length === 0) {
            return res.status(404).json({ message: "Activity not found" });
        }

        const { zone_id } = activityResult.rows[0];

        // Authorization: only a worker assigned to this activity's zone may attach evidence
        const assignment = await pool.query(
            `SELECT 1 FROM zone_assignments WHERE user_id = $1 AND zone_id = $2 AND status = 'ACTIVE'`,
            [req.user.userId, zone_id]
        );

        if (assignment.rows.length === 0) {
            return res.status(403).json({ message: "You are not assigned to this zone" });
        }

        // Hash the file server-side, before it ever leaves this process
        const sha256Hash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");

        const safeName = sanitizeFileName(req.file.originalname);
        const storagePath = `activity_${activityId}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            return res.status(500).json({ message: "File upload failed" });
        }

        const result = await pool.query(
            `
            INSERT INTO evidence (activity_id, file_name, file_url, sha256_hash, uploaded_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, file_name, sha256_hash, uploaded_at
            `,
            [activityId, req.file.originalname, storagePath, sha256Hash, req.user.userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Upload evidence error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/evidence/:activityId — list evidence for an activity, with short-lived signed URLs
const getActivityEvidence = async (req, res) => {
    try {
        const { activityId } = req.params;

        const activityResult = await pool.query(
            `SELECT zone_id FROM rehabilitation_activities WHERE id = $1`,
            [activityId]
        );

        if (activityResult.rows.length === 0) {
            return res.status(404).json({ message: "Activity not found" });
        }

        const { zone_id } = activityResult.rows[0];

        const assignment = await pool.query(
            `SELECT 1 FROM zone_assignments WHERE user_id = $1 AND zone_id = $2 AND status = 'ACTIVE'`,
            [req.user.userId, zone_id]
        );

        if (assignment.rows.length === 0) {
            return res.status(403).json({ message: "You are not assigned to this zone" });
        }

        const evidenceResult = await pool.query(
            `SELECT id, file_name, file_url, sha256_hash, uploaded_at
             FROM evidence WHERE activity_id = $1 ORDER BY uploaded_at DESC`,
            [activityId]
        );

        // Generate a short-lived signed URL per file rather than exposing the bucket publicly
        const withUrls = await Promise.all(
            evidenceResult.rows.map(async (row) => {
                const { data, error } = await supabase.storage
                    .from(BUCKET)
                    .createSignedUrl(row.file_url, 60 * 5); // 5-minute expiry

                return {
                    ...row,
                    signed_url: error ? null : data.signedUrl
                };
            })
        );

        res.json(withUrls);
    } catch (error) {
        console.error("Get evidence error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/evidence/:evidenceId/verify — recompute the file's hash and compare to what was recorded at upload
const verifyEvidence = async (req, res) => {
    try {
        const { evidenceId } = req.params;

        const result = await pool.query(
            `SELECT file_url, sha256_hash FROM evidence WHERE id = $1`,
            [evidenceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Evidence not found" });
        }

        const { file_url: storagePath, sha256_hash: recordedHash } = result.rows[0];

        const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);

        if (error) {
            console.error("Supabase download error:", error);
            return res.status(500).json({ message: "Could not retrieve file for verification" });
        }

        const buffer = Buffer.from(await data.arrayBuffer());
        const currentHash = crypto.createHash("sha256").update(buffer).digest("hex");

        res.json({
            matches: currentHash === recordedHash,
            recordedHash,
            currentHash
        });
    } catch (error) {
        console.error("Verify evidence error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { uploadEvidence, getActivityEvidence, verifyEvidence };