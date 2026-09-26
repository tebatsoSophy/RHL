const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const mineRoutes = require("./routes/mineRoutes");
const zoneRoutes = require("./routes/zoneRoutes");

app.use(cors());
app.use(express.json());
app.use("/api/mines", mineRoutes);
app.use("/api/zones", zoneRoutes);
    
app.get("/", (req, res) => {
    res.json({
        message: "RehabLedger API is running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`RehabLedger API running on port ${PORT}`);
});