const requireWorker = (req, res, next) => {

    if (!req.user) {

        return res.status(401).json({
            message:
                "Authentication required"
        });
    }


    if (req.user.role !== "WORKER") {

        return res.status(403).json({
            message:
                "Worker access required"
        });
    }


    next();
};


module.exports = requireWorker;