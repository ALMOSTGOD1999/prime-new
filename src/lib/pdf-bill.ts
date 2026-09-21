import jsPDF from "jspdf";

// ── Color palette ──
const GOLD = [212, 169, 26] as const; // #D4A91A
const NAVY = [26, 26, 78] as const; // #1a1a4e
const LIGHT_GOLD = [255, 248, 230] as const; // warm cream
const WHITE = [255, 255, 255] as const;
const GRAY = [120, 120, 120] as const;
const LIGHT_GRAY = [240, 240, 240] as const;

// ── Data interface ──
export interface PurchaseBillData {
  purchaseId: number;
  carat: number;
  weight?: number;
  goldRatePerGram?: number;
  goldValue?: number;
  makingCharges?: number;
  gst?: number;
  cgst?: number;
  sgst?: number;
  additionalCharges?: number;
  hallmarkCharges?: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userId?: number;
  monthlyReturnAmount?: number;
  monthlyReturnPct?: number;
  packageName?: string;
}

// ── Helpers ──
function formatINR(n: number): string {
  return "\u20B9" + n.toLocaleString("en-IN");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// ── Load logo SVG → PNG data URL via canvas ──
let cachedLogoDataUrl: string | null = null;

function loadLogoImage(): Promise<string> {
  if (cachedLogoDataUrl) return Promise.resolve(cachedLogoDataUrl);
  return fetch("/logo.svg")
    .then((r) => r.text())
    .then(
      (svg) =>
        new Promise<string>((resolve) => {
          const blob = new Blob([svg], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 200;
            canvas.height = 220;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, 200, 220);
            URL.revokeObjectURL(url);
            cachedLogoDataUrl = canvas.toDataURL("image/png");
            resolve(cachedLogoDataUrl);
          };
          img.src = url;
        })
    );
}

// ── Main generator ──
export async function generatePurchaseBill(data: PurchaseBillData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Outer decorative border ──
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.roundedRect(8, 8, pageW - 16, 297 - 16, 3, 3);
  doc.setLineWidth(0.4);
  doc.roundedRect(10, 10, pageW - 20, 297 - 20, 2, 2);

  // ── Background fill ──
  doc.setFillColor(...LIGHT_GOLD);
  doc.rect(12, 12, pageW - 24, 297 - 24, "F");

  // ── Top gold banner with logo ──
  doc.setFillColor(...GOLD);
  doc.rect(12, 12, pageW - 24, 30, "F");
  y = 24;

  // Load actual logo image
  const logoDataUrl = await loadLogoImage();
  doc.addImage(logoDataUrl, "PNG", pageW / 2 - 26, y - 6, 22, 24);

  // Company name next to logo
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("PRIME", pageW / 2 + 4, y);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("JEWELLERY", pageW / 2 + 4, y + 6);

  y = 48;

  // ── Invoice title bar ──
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentW, 10, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PURCHASE INVOICE", pageW / 2, y + 7, { align: "center" });
  y += 16;

  // ── Invoice info row ──
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(`Invoice No: INV-PUR-${data.purchaseId}`, margin + 4, y);
  doc.text(`Date: ${formatDate(data.createdAt)}`, pageW - margin - 4, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const statusLabel = data.status.charAt(0).toUpperCase() + data.status.slice(1);
  doc.text(`Status: ${statusLabel}`, margin + 4, y);
  y += 10;

  // ── Thin separator ──
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, y, pageW - margin - 4, y);
  y += 8;

  // ── Customer details ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("CUSTOMER DETAILS", margin + 4, y);
  y += 6;

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (data.userName) {
    doc.setFont("helvetica", "bold");
    doc.text(data.userName, margin + 4, y);
    doc.setFont("helvetica", "normal");
    y += 5;
  }
  if (data.userEmail) {
    doc.setTextColor(...GRAY);
    doc.text(data.userEmail, margin + 4, y);
    y += 5;
  }
  if (data.userId) {
    doc.text(`User ID: ${data.userId}`, margin + 4, y);
    y += 5;
  }
  // If no customer info at all, show placeholder
  if (!data.userName && !data.userEmail && !data.userId) {
    doc.setTextColor(...GRAY);
    doc.text("Valued Customer", margin + 4, y);
    y += 5;
  }
  y += 4;

  // ── Thin separator ──
  doc.setDrawColor(...GOLD);
  doc.line(margin + 4, y, pageW - margin - 4, y);
  y += 8;

  // ── Billing details ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("BILLING DETAILS", margin + 4, y);
  y += 8;

  // Table header
  doc.setFillColor(...NAVY);
  doc.rect(margin + 4, y - 4, contentW - 8, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("DESCRIPTION", margin + 8, y + 1);
  doc.text("VALUE", pageW - margin - 4, y + 1, { align: "right" });
  y += 8;

  // Table rows
  const rows: [string, string][] = [];

  if (data.carat) rows.push([`Gold Purity`, `${data.carat}K`]);
  if (data.weight) rows.push([`Weight`, `${data.weight}g`]);
  if (data.goldRatePerGram) rows.push([`Gold Rate per Gram`, formatINR(data.goldRatePerGram)]);
  if (data.goldValue) rows.push([`Gold Value`, formatINR(data.goldValue)]);
  if (data.makingCharges) rows.push([`Making Charges (${8}%)`, formatINR(data.makingCharges)]);
  if (data.cgst) rows.push([`CGST (${9}%)`, formatINR(data.cgst)]);
  if (data.sgst) rows.push([`SGST (${9}%)`, formatINR(data.sgst)]);
  if (data.hallmarkCharges) rows.push([`Hallmark Charges`, formatINR(data.hallmarkCharges)]);
  if (data.additionalCharges && data.additionalCharges > 0) rows.push([`Additional Charges`, formatINR(data.additionalCharges)]);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  rows.forEach((row, i) => {
    const rowY = y + i * 7;
    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(...WHITE);
      doc.rect(margin + 4, rowY - 4, contentW - 8, 7, "F");
    }
    doc.setTextColor(...NAVY);
    doc.text(row[0], margin + 8, rowY + 1);
    doc.setTextColor(...GRAY);
    doc.text(row[1], pageW - margin - 4, rowY + 1, { align: "right" });
  });

  y += rows.length * 7 + 2;

  // ── Total bar ──
  y += 4;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin + 4, y, pageW - margin - 4, y);
  y += 2;

  doc.setFillColor(...GOLD);
  doc.roundedRect(margin + 4, y, contentW - 8, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL AMOUNT", margin + 10, y + 8);
  doc.setFontSize(11);
  doc.text(formatINR(data.totalAmount), pageW - margin - 6, y + 8, { align: "right" });
  y += 18;

  // ── Tax summary box ──
  if (data.cgst || data.sgst) {
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin + 4, y, contentW - 8, 14, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text("TAX SUMMARY", margin + 8, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    if (data.cgst) doc.text(`CGST @9%: ${formatINR(data.cgst)}`, margin + 8, y + 11);
    if (data.sgst) doc.text(`SGST @9%: ${formatINR(data.sgst)}`, pageW / 2, y + 11);
    y += 18;
  }

  // ── Customer Signature section ──
  y += 8;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, y, pageW - margin - 4, y);
  y += 16;

  // Left signature: Customer
  const sigLineW = 55;
  const leftSigX = margin + 10;
  const rightSigX = pageW / 2 + 15;

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(leftSigX, y, leftSigX + sigLineW, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("Customer Signature", leftSigX + sigLineW / 2, y + 6, { align: "center" });

  // Right signature: Authorized Signatory
  doc.line(rightSigX, y, rightSigX + sigLineW, y);
  doc.text("Authorized Signatory", rightSigX + sigLineW / 2, y + 6, { align: "center" });

  // ── Footer ──
  const footerY = 297 - 40;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, footerY, pageW - margin - 4, footerY);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("Thank you for your purchase!", pageW / 2, footerY + 8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("This is a computer-generated invoice. No signature required.", pageW / 2, footerY + 14, {
    align: "center",
  });
  doc.text("Prime Jewellery & Investments \u2022 www.primejewellery.in", pageW / 2, footerY + 19, {
    align: "center",
  });

  // ── Download ──
  doc.save(`PRIME-Invoice-${data.purchaseId}.pdf`);
}
