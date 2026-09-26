const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required",
            
        });
    }

    if (req.user.role !== "ADMIN") {
        return res.status(403).json({
            message: "Admin access required",
            role: req.user.role

        });
    }

    next();
};

module.exports = requireAdmin;