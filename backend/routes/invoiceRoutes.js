// routes/invoiceRoutes.js
import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
  const userEmail = req.query.userEmail;
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
   📌 POST Create Invoice (with GST, CGST, SGST)
   ================================================== */
router.post("/", async (req, res) => {
  try {
    const invoiceData = req.body;

    if (
      !invoiceData?.customerName ||
      !Array.isArray(invoiceData.items) ||
      invoiceData.items.length === 0 ||
      !invoiceData.userEmail
    ) {
      return res.status(400).json({ success: false, message: "Invalid invoice payload" });
    }

    let subtotal = 0;
    let totalTax = 0;

    invoiceData.items.forEach((item) => {
      const lineTotal = (item.quantity || 0) * (item.price || 0);
      subtotal += lineTotal;
      const itemTax = lineTotal * ((item.taxRate || 0) / 100);
      totalTax += itemTax;
    });

    // GST breakdown
    const gst = +totalTax.toFixed(2);
    const cgst = +(gst / 2).toFixed(2);
    const sgst = +(gst / 2).toFixed(2);
    const total = +(subtotal + gst).toFixed(2);

    const newInvoice = new Invoice({
      userEmail: invoiceData.userEmail,
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone || "",
      customerEmail: invoiceData.customerEmail || "",
      date: invoiceData.date || new Date(),
      items: invoiceData.items,
      subtotal,
      gst,
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

  try {
    /* ---------------- Load Company Info ---------------- */
    let company = {
      name: "Default Company",
      address: "Default Address",
      gstin: "Default GSTIN",
      email: "default@example.com",
      logo: null,
    };

    if (fs.existsSync(companyFile)) {
      company = JSON.parse(fs.readFileSync(companyFile, "utf-8"));
    }

    const logoPath = company.logo ? path.join(__dirname, "..", company.logo) : defaultLogoPath;
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 40, { fit: [60, 60] });
    }

    // Company Details
    doc.fontSize(11).font("Helvetica-Bold").text(company.name, 120, 45);
    doc.fontSize(9).font("Helvetica");
    doc.text(company.address, 120, 60, { width: 250 });
    doc.text(`GSTIN: ${company.gstin}`, 120, 105);
    doc.text(`Email: ${company.email}`, 120, 120);

    // Invoice Header
    const rightX = 320;
    doc.fontSize(16).font("Helvetica-Bold").text("Original Tax Invoice", rightX, 50, { align: "right" });
    doc.fontSize(10).font("Helvetica");
    doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, rightX, 90);
    doc.text(`Invoice Number: INV${invoice._id.toString().slice(-5)}`, rightX, 105);
    doc.text(`Customer Name: ${invoice.customerName}`, rightX, 120);
    doc.text(`Mobile Number: ${invoice.customerPhone || "N/A"}`, rightX, 135);

    // Separator
    doc.moveTo(50, 160).lineTo(550, 160).stroke();

    /* ---------------- Invoice Table ---------------- */
    let tableTop = 180;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Description", 50, tableTop);
    doc.text("Qty", 200, tableTop);
    doc.text("Unit Price", 260, tableTop);
    doc.text("Tax %", 340, tableTop);
    doc.text("Amount (INR)", 420, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 30;
    doc.font("Helvetica");

    invoice.items.forEach((item) => {
      const lineTotal = (item.quantity || 0) * (item.price || 0);

      doc.text(item.description || "-", 50, y, { width: 140 });
      doc.text(String(item.quantity ?? 0), 210, y);
      doc.text(`₹${(item.price ?? 0).toFixed(2)}`, 270, y);
      doc.text(`${item.taxRate || 0}%`, 350, y);
      doc.text(`₹${lineTotal.toFixed(2)}`, 430, y);
      y += 20;
    });

    // Totals Section (⚡ now using stored values)
    y += 10;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 20;

    doc.font("Helvetica");
    doc.text("Subtotal", 50, y);
    doc.text(`₹${invoice.subtotal.toFixed(2)}`, 430, y);
    y += 20;

    doc.text("GST", 50, y);
    doc.text(`₹${invoice.gst.toFixed(2)}`, 430, y);
    y += 20;

    doc.text("CGST", 50, y);
    doc.text(`₹${invoice.cgst.toFixed(2)}`, 430, y);
    y += 20;

    doc.text("SGST", 50, y);
    doc.text(`₹${invoice.sgst.toFixed(2)}`, 430, y);
    y += 20;

    doc.font("Helvetica-Bold");
    const grandTotalY = y;
    doc.moveTo(50, grandTotalY - 5).lineTo(550, grandTotalY - 5).stroke();
    doc.text("Grand Total", 50, grandTotalY);
    doc.text(`₹${invoice.total.toFixed(2)}`, 430, grandTotalY);
    doc.moveTo(50, grandTotalY + 20).lineTo(550, grandTotalY + 20).stroke();

    // Footer
    doc.moveDown(4);
    doc.text("Authorised Signatory", 50, grandTotalY + 60);
    doc.fontSize(9).font("Helvetica-Oblique");
    doc.text(`© ${company.name}, ${new Date().getFullYear()}`, 50, 750, { align: "center" });
    doc.text("Page 1", 50, 765, { align: "center" });
  } catch (err) {
    console.error("⚠️ PDF build error:", err);
    doc.fontSize(14).fillColor("red").text("Error generating invoice PDF", 50, 100);
  }

  doc.end();
}

/* ==================================================
   📌 GET Invoice PDF (Download)
   ================================================== */
router.get("/:id/pdf", async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).catch(() => null);
  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }
  generateInvoicePDF(invoice, res, true);
});

/* ==================================================
   📌 GET Invoice PDF (Print/Inline)
   ================================================== */
router.get("/:id/print", async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).catch(() => null);
  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }
  generateInvoicePDF(invoice, res, false);
});

export default router;
