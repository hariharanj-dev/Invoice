import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    // Render/Heroku: store with literal \n, then convert here
    private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });

const spreadsheetId = process.env.SPREADSHEET_ID;
const range = "Sheet1!A:I"; // 9 columns below

// Define your column headers
const HEADERS = [
  "ID",
  "Customer Name",
  "Customer Phone",
  "Customer Email",
  "Date",
  "Items",
  "Subtotal",
  "Taxes (CGST+SGST)",
  "Total",
];

export async function addInvoiceToSheet(invoice) {
  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID is not configured");
  }

  // Ensure auth has credentials
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Google service account credentials are not set");
  }

  try {
    // 1) Check/Write headers
    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A1:I1",
    });
    const existingHeaders = headersRes.data.values?.[0] || [];

    if (existingHeaders.length !== HEADERS.length ||
        existingHeaders.some((h, idx) => h !== HEADERS[idx])) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Sheet1!A1:I1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [HEADERS] },
      });
    }

    // 2) Convert invoice to row
    const itemList = (invoice.items || [])
      .map((i) => `${i.description} x${i.quantity}`)
      .join(", ");

    const row = [
      invoice.id || "",
      invoice.customerName || "",
      invoice.customerPhone || "",
      invoice.customerEmail || "",
      invoice.date ? new Date(invoice.date).toLocaleString() : "",
      itemList || "",
      Number(invoice.subtotal || 0),
      Number((invoice.cgst || 0) + (invoice.sgst || 0)),
      Number(invoice.total || 0),
    ];

    // 3) Append
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return appendRes.data;
  } catch (err) {
    console.error("❌ Google Sheets error:", err?.message || err);
    throw err;
  }
}
