const requireReviewer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
    }

    if (!["SPECIALIST", "REGULATOR"].includes(req.user.role)) {
        return res.status(403).json({ message: "Reviewer access required" });
    }

    next();
};

module.exports = requireReviewer;