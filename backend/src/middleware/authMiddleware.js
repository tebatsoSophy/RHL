const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    console.log("AUTH MIDDLEWARE HIT");
    console.log("METHOD:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("AUTH HEADER:", req.headers.authorization);

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("NO BEARER TOKEN");

            return res.status(401).json({
                message: "Authentication token required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        console.log("DECODED USER:", decoded);

        req.user = decoded;

        next();
    } catch (error) {
        console.log("JWT ERROR:", error.message);

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authenticateToken;