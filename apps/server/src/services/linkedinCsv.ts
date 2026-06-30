// Parses LinkedIn's "Connections.csv" export. LinkedIn prefixes the real
// header with a few "Notes:" lines, so we scan for the header row instead of
// assuming row 0. Field-quoting (commas/newlines inside quoted values) is
// handled by a small hand-rolled state machine rather than pulling in a CSV
// dependency for one well-known, simple format.

interface ParsedConnection {
  name?: string;
  url?: string;
  connected_on?: string;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function parseConnectionsCsv(text: string): ParsedConnection[] {
  const rows = parseCsvRows(text);
  const headerIdx = rows.findIndex((r) => r[0]?.trim().toLowerCase() === "first name");
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const firstNameCol = col("first name");
  const lastNameCol = col("last name");
  const urlCol = col("url");
  const connectedOnCol = col("connected on");

  return rows
    .slice(headerIdx + 1)
    .map((r) => {
      const first = firstNameCol >= 0 ? r[firstNameCol]?.trim() : "";
      const last = lastNameCol >= 0 ? r[lastNameCol]?.trim() : "";
      const name = [first, last].filter(Boolean).join(" ").trim();
      const url = urlCol >= 0 ? r[urlCol]?.trim() : "";
      const connected_on = connectedOnCol >= 0 ? r[connectedOnCol]?.trim() : "";
      return {
        name: name || undefined,
        url: url || undefined,
        connected_on: connected_on || undefined,
      };
    })
    .filter((c) => c.name || c.url);
}
