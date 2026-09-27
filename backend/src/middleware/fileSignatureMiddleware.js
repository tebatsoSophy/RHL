// Checks the file's actual binary signature ("magic bytes") rather than trusting
// the browser-supplied mimetype, which is trivial to spoof by renaming a file.

const SIGNATURES = {
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    "application/pdf": [[0x25, 0x50, 0x44, 0x46, 0x2d]], // "%PDF-"
    // WEBP: "RIFF" .... "WEBP" — two signature checks at different offsets
};

function matchesSignature(buffer, signatureBytes) {
    if (buffer.length < signatureBytes.length) return false;
    return signatureBytes.every((byte, i) => buffer[i] === byte);
}

function isWebp(buffer) {
    if (buffer.length < 12) return false;
    const riff = buffer.slice(0, 4).toString("ascii");
    const webp = buffer.slice(8, 12).toString("ascii");
    return riff === "RIFF" && webp === "WEBP";
}

function looksLikeCsv(buffer) {
    // CSV has no magic bytes (it's plain text) — best we can do is confirm
    // it's not binary content pretending to be a CSV.
    const sample = buffer.slice(0, 1024);
    for (const byte of sample) {
        if (byte === 0) return false; // null bytes never appear in real text
    }
    return true;
}

function verifyFileSignature(req, res, next) {
    if (!req.file) {
        return res.status(400).json({ message: "A file is required" });
    }

    const { buffer, mimetype } = req.file;

    let valid = false;

    if (mimetype === "image/webp") {
        valid = isWebp(buffer);
    } else if (mimetype === "text/csv" || mimetype === "application/vnd.ms-excel") {
        valid = looksLikeCsv(buffer);
    } else if (SIGNATURES[mimetype]) {
        valid = SIGNATURES[mimetype].some((sig) => matchesSignature(buffer, sig));
    }

    if (!valid) {
        return res.status(400).json({
            message: "File content does not match its declared type. Upload may be corrupted or disguised."
        });
    }

    next();
}

module.exports = verifyFileSignature;