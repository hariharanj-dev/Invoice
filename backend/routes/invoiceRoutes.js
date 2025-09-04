// routes/invoiceRoutes.js
import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { addInvoiceToSheet } from "../googleSheets.js";
import Invoice from "../models/Invoice.js";

const router = express.Router();

/* ---------------- Path Helpers ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const companyFile = path.join(__dirname, "../assets/company.json");
const defaultLogoPath = path.join(__dirname, "../assets/thiranity.jpg");

/* ==================================================
   📌 GET All Invoices (Filtered by user email)
   ================================================== */
router.get("/", async (req, res) => {
  const userEmail = req.query.userEmail; // get user email from query
  if (!userEmail) {
    return res.status(400).json({ success: false, message: "User email is required" });
  }

  try {
    const invoices = await Invoice.find({ userEmail }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: invoices });
  } catch (err) {
    console.error("Error fetching invoices:", err);
    res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
});


/* ==================================================
   📌 GET One Invoice
   ================================================== */
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching invoice" });
  }
});

/* ==================================================
   📌 POST Create Invoice
   ================================================== */
router.post("/", async (req, res) => {
  try {
    const invoiceData = req.body;
    if (!invoiceData?.customerName || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0 || !invoiceData.userEmail) {
      return res.status(400).json({ success: false, message: "Invalid invoice payload" });
    }

    const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
    const cgst = +(subtotal * 0.09).toFixed(2);
    const sgst = +(subtotal * 0.09).toFixed(2);
    const total = +(subtotal + cgst + sgst).toFixed(2);

    const newInvoice = new Invoice({
      userEmail: invoiceData.userEmail, // 👈 save the logged-in user email
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone || "",
      customerEmail: invoiceData.customerEmail || "",
      date: invoiceData.date || new Date(),
      items: invoiceData.items,
      subtotal,
      cgst,
      sgst,
      total,
    });

    await newInvoice.save();
    res.status(201).json({ success: true, data: newInvoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error while saving invoice" });
  }
});


/* ==================================================
   🔹 Helper: PDF Generator
   ================================================== */
function generateInvoicePDF(invoice, res, download = true) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename=invoice_${invoice._id}.pdf`
  );

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  /* ---------------- Load Company Info ---------------- */
  let company = {
    name: "Default Company",
    address: "Default Address",
    gstin: "Default GSTIN",
    email: "default@example.com",
    logo: null,
  };

  try {
    if (fs.existsSync(companyFile)) {
      company = JSON.parse(fs.readFileSync(companyFile, "utf-8"));
    }
  } catch (err) {
    console.error("⚠️ Error loading company.json:", err);
  }

  const logoToUse = company.logo
    ? path.join(__dirname, "..", company.logo)
    : defaultLogoPath;

  if (fs.existsSync(logoToUse)) {
    doc.image(logoToUse, 50, 40, { fit: [60, 60] });
  }

  doc.fontSize(11).font("Helvetica-Bold").text(company.name, 120, 45);
  doc.fontSize(9).font("Helvetica");
  doc.text(company.address, 120, 60, { width: 250 });
  doc.text(`GSTIN: ${company.gstin}`, 120, 105);
  doc.text(`Email: ${company.email}`, 120, 120);

  const rightX = 320;
  doc.fontSize(16).font("Helvetica-Bold").text("Original Tax Invoice", rightX, 50, { align: "right" });
  doc.fontSize(10).font("Helvetica");
  doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, rightX, 90);
  doc.text(`Invoice Number: INV${invoice._id.toString().slice(-5)}`, rightX, 105);
  doc.text(`Customer Name: ${invoice.customerName}`, rightX, 120);
  doc.text(`Mobile Number: ${invoice.customerPhone || "N/A"}`, rightX, 135);

  // Separator
  doc.moveTo(50, 160).lineTo(550, 160).stroke();

  let tableTop = 180;
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Description", 50, tableTop);
  doc.text("Qty", 250, tableTop);
  doc.text("Unit Price", 320, tableTop);
  doc.text("Amount (INR)", 420, tableTop);

  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let y = tableTop + 30;
  doc.font("Helvetica");
  invoice.items.forEach((item) => {
    const lineTotal = (item.quantity || 0) * (item.price || 0);
    doc.text(item.description || "-", 50, y, { width: 180 });
    doc.text(String(item.quantity ?? 0), 260, y);
    doc.text(`₹${(item.price ?? 0).toFixed(2)}`, 330, y);
    doc.text(`₹${lineTotal.toFixed(2)}`, 430, y);
    y += 20;
  });

  y += 10;
  doc.moveTo(50, y).lineTo(550, y).stroke();
  y += 20;

  doc.font("Helvetica");
  doc.text("Subtotal", 50, y);
  doc.text(`₹${invoice.subtotal.toFixed(2)}`, 430, y);
  y += 20;

  doc.text("CGST (9%)", 50, y);
  doc.text(`₹${invoice.cgst.toFixed(2)}`, 430, y);
  y += 20;

  doc.text("SGST (9%)", 50, y);
  doc.text(`₹${invoice.sgst.toFixed(2)}`, 430, y);
  y += 20;

  doc.font("Helvetica-Bold");
  const grandTotalY = y;

  doc.moveTo(50, grandTotalY - 5).lineTo(550, grandTotalY - 5).stroke();
  doc.text("Grand Total", 50, grandTotalY);
  doc.text(`₹${invoice.total.toFixed(2)}`, 430, grandTotalY);
  doc.moveTo(50, grandTotalY + 20).lineTo(550, grandTotalY + 20).stroke();

  doc.moveDown(4);
  doc.text("Authorised Signatory", 50, grandTotalY + 60);

  doc.fontSize(9).font("Helvetica-Oblique");
  doc.text(`© ${company.name}, ${new Date().getFullYear()}`, 50, 750, { align: "center" });
  doc.text("Page 1", 50, 765, { align: "center" });

  doc.end();
}

/* ==================================================
   📌 GET Invoice PDF (Download)
   ================================================== */
router.get("/:id/pdf", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    generateInvoicePDF(invoice, res, true);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error generating PDF" });
  }
});

/* ==================================================
   📌 GET Invoice PDF (Print/Inline)
   ================================================== */
router.get("/:id/print", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    generateInvoicePDF(invoice, res, false);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error generating PDF" });
  }
});

export default router;
