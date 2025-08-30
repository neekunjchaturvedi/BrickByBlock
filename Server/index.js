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
app.use("/api", apiRoutes); // Use the routes defined in api.js
app.use("/api/auth", authRoutes);

// --- Server Startup ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ BrickByBlock Backend is running on port ${PORT}`);
});
