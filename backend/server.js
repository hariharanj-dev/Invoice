// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// __dirname fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(cors( "*"));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Routes
app.use("/api/invoices", invoiceRoutes);
app.use("/api/company", companyRoutes);

// Health check
app.get("/", (_req, res) => {
  res.send("✅ Invoice API is running");
});

// Error Handling
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
