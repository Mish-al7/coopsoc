"use client";

// Opens the browser's print window; "Save as PDF" there gives the receipt as a PDF
// (works on phones too, and keeps Malayalam text exactly as shown).
export function ReceiptPrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
      ⬇ {label}
    </button>
  );
}
