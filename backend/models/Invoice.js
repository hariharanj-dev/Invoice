// models/Invoice.js
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  taxRate: { type: Number, default: 0 }, // GST % per item
});

const invoiceSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true }, // user who created invoice
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    customerEmail: { type: String },

    date: { type: Date, default: Date.now },

    items: [itemSchema],

    // Calculated fields
    subtotal: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },   // ✅ total GST (CGST + SGST)
    cgst: { type: Number, default: 0 },  // ✅ 50% of GST
    sgst: { type: Number, default: 0 },  // ✅ 50% of GST
    total: { type: Number, default: 0 }, // ✅ Subtotal + GST
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
