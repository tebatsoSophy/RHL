const multer = require("multer");

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/csv",
    "application/vnd.ms-excel" // some browsers report CSVs this way
];

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const storage = multer.memoryStorage(); // keep the file in memory only long enough to hash + forward to Supabase

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error("File type not allowed. Upload an image, PDF, or CSV."));
        }
        cb(null, true);
    }
});

module.exports = upload;