import Papa from "papaparse";

export interface ParsedKeetaRow {
  externalRiderRef: string | null;
  riderNameRaw: string | null;
  riderPhoneRaw: string | null;
  orders: number | null;
  onTimePct: number | null;
  avgDeliveryMin: number | null;
  cancellations: number | null;
  customerRating: number | null;
  earningsCents: number | null;
  raw: Record<string, unknown>;
}

// Keeta column headers vary by region/locale; map common variants to canonical fields.
// Expand as real CSV samples come in.
const COLUMN_MAP: Record<string, keyof ParsedKeetaRow | "ignore"> = {
  rider_id: "externalRiderRef",
  "rider id": "externalRiderRef",
  courier_id: "externalRiderRef",
  rider_name: "riderNameRaw",
  "rider name": "riderNameRaw",
  courier_name: "riderNameRaw",
  rider_phone: "riderPhoneRaw",
  phone: "riderPhoneRaw",
  orders: "orders",
  total_orders: "orders",
  on_time_rate: "onTimePct",
  "on-time %": "onTimePct",
  avg_delivery_minutes: "avgDeliveryMin",
  avg_delivery_time: "avgDeliveryMin",
  cancellations: "cancellations",
  customer_rating: "customerRating",
  rating: "customerRating",
  earnings: "earningsCents",
  total_earnings: "earningsCents",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function numberOr<T>(v: unknown, fallback: T): number | T {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[, %$]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function parseKeetaCsv(text: string): ParsedKeetaRow[] {
  const { data, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });
  if (errors.length) {
    // Don't throw on row-level parse errors; let caller see what was parsed.
    console.warn("[csv] PapaParse errors:", errors.slice(0, 3));
  }
  return data.map((row) => {
    const out: ParsedKeetaRow = {
      externalRiderRef: null,
      riderNameRaw: null,
      riderPhoneRaw: null,
      orders: null,
      onTimePct: null,
      avgDeliveryMin: null,
      cancellations: null,
      customerRating: null,
      earningsCents: null,
      raw: row,
    };
    for (const [k, v] of Object.entries(row)) {
      const field = COLUMN_MAP[k];
      if (!field || field === "ignore") continue;
      if (field === "earningsCents") {
        const n = numberOr(v, null);
        out.earningsCents = n === null ? null : Math.round(n * 100);
      } else if (
        field === "orders" ||
        field === "cancellations" ||
        field === "onTimePct" ||
        field === "avgDeliveryMin" ||
        field === "customerRating"
      ) {
        out[field] = numberOr(v, null);
      } else if (
        field === "externalRiderRef" ||
        field === "riderNameRaw" ||
        field === "riderPhoneRaw"
      ) {
        const s = (v ?? "").toString().trim();
        out[field] = s.length ? s : null;
      }
    }
    return out;
  });
}
