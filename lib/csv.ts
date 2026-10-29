// Builds a CSV that opens cleanly in Excel and Google Sheets: UTF-8 with a BOM (so ₹
// and Indian names show right), Windows line endings, quotes doubled.
type Cell = string | number | null | undefined;

function escapeCell(value: Cell) {
  if (value === null || value === undefined) return "";

  let text = String(value);

  // A text cell that starts with = + - @ can run as a formula in a spreadsheet.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: Cell[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
