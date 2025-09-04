// models/Invoice.js
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    customerEmail: { type: String },
    date: { type: Date, default: Date.now },
    items: [itemSchema],
    subtotal: Number,
    cgst: Number,
    sgst: Number,
    total: Number,
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
