// routes/companyRoutes.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.join(__dirname, "../assets");
const COMPANY_FILE = path.join(assetsDir, "company.json");

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(COMPANY_FILE)) {
  fs.writeFileSync(
    COMPANY_FILE,
    JSON.stringify(
      {
        name: "Thiranity Tech Pvt. Ltd.",
        address: "No:1226, Magnum Towers, Saibabacolony, Coimbatore - 641043.",
        gstin: "33AAFCEXXXXXM1ZM",
        email: "support@thiranity.com",
        logo: "/assets/company-logo.png",
      },
      null,
      2
    )
  );
}

// Multer setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, assetsDir),
  filename: (_req, file, cb) => cb(null, "company-logo" + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Get company details
router.get("/", (_req, res) => {
  try {
    const data = fs.readFileSync(COMPANY_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ message: "Error reading company data" });
  }
});

// Update company details
router.put("/", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(COMPANY_FILE, "utf-8"));
    const updated = { ...data, ...req.body };
    fs.writeFileSync(COMPANY_FILE, JSON.stringify(updated, null, 2));
    res.json({ success: true, company: updated });
  } catch {
    res.status(500).json({ message: "Error updating company data" });
  }
});

// Upload logo
router.post("/logo", upload.single("logo"), (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(COMPANY_FILE, "utf-8"));
    const updated = { ...data, logo: "/assets/" + req.file.filename };
    fs.writeFileSync(COMPANY_FILE, JSON.stringify(updated, null, 2));
    res.json({ success: true, company: updated });
  } catch {
    res.status(500).json({ message: "Error uploading logo" });
  }
});

export default router;
