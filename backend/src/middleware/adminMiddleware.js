const requireAdmin = (req, res, next) => {
if (!req.user) {
return res.status(401).json({
message: "Authentication required"
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

const requireAdmins = (req, res, next) => {
if (!req.user) {
return res.status(401).json({
message: "Authentication required"
});
}


if (req.user.role !== "ADMIN" && req.user.role !== "MINE") {
    return res.status(403).json({
        message: "Admin or Mine admin access required",
        role: req.user.role
    });
}

next();


};

module.exports = {
requireAdmin,
requireAdmins
};
