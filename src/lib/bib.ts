/**
 * Global 4-Digit BIB Formatting Utilities
 * 
 * In Supabase, nomor_bib is stored as a standard integer (SERIAL 1, 2, 3...).
 * The application strictly formats it on the client side as a 4-digit zero-padded
 * string (0001, 0002, ..., 9999).
 */

/**
 * Formats a numeric or string BIB number into a 4-digit zero-padded string.
 * Examples:
 *   formatBIB(1)   -> '0001'
 *   formatBIB(15)  -> '0015'
 *   formatBIB(230) -> '0230'
 *   formatBIB(null) -> '-'
 */
export function formatBIB(
  bibNumber: number | string | null | undefined,
  fallback: string = "-"
): string {
  if (
    bibNumber === null ||
    bibNumber === undefined ||
    bibNumber === "" ||
    bibNumber === "null" ||
    bibNumber === "undefined"
  ) {
    return fallback;
  }
  const parsed = typeof bibNumber === "number" ? bibNumber : Number(bibNumber);
  if (isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return String(parsed).padStart(4, "0");
}

/**
 * Returns '#0001' if bib is valid, or the fallback string (e.g. 'Menunggu Verifikasi' or '-') without prepending '#'
 */
export function formatBIBWithHash(
  bibNumber: number | string | null | undefined,
  fallback: string = "-"
): string {
  const formatted = formatBIB(bibNumber, "");
  return formatted ? `#${formatted}` : fallback;
}

/**
 * Excel-safe CSV BIB formatter.
 * When Excel opens a CSV, it automatically drops leading zeros on numeric strings like "0001" -> 1.
 * Wrapping the value in the formula format `="0001"` forces Excel to treat it strictly as a text string.
 */
export function formatBIBCSV(
  bibNumber: number | string | null | undefined,
  fallback: string = ""
): string {
  if (bibNumber === null || bibNumber === undefined || bibNumber === "") {
    return fallback;
  }
  const formatted = formatBIB(bibNumber, "");
  if (!formatted) return fallback;
  // Excel formula format for text preservation
  return `="${formatted}"`;
}

/**
 * Client-side CSV Download Helper with UTF-8 BOM.
 * Encodes CSV with \uFEFF so Excel, LibreOffice, and Google Sheets correctly parse UTF-8 characters.
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const escapeCell = (cell: string | number | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    // If it's an Excel formula wrapper like ="0001", don't double quote the wrapper
    if (str.startsWith('="') && str.endsWith('"')) {
      return str;
    }
    // Escape internal quotes
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvLines: string[] = [];
  csvLines.push(headers.map(escapeCell).join(","));

  for (const row of rows) {
    csvLines.push(row.map(escapeCell).join(","));
  }

  const csvContent = "\uFEFF" + csvLines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
