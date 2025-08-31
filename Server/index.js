// Load environment variables from the .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Initialize the Express app
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const portfolioRoutes = require("./routes/portfolio");
app.use("/api/assets", apiRoutes); // Use the routes defined in api.js
app.use("/api/auth", authRoutes);
app.use("/api/portfolio", portfolioRoutes);

// --- Server Startup ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ BrickByBlock Backend is running on port ${PORT}`);
});
