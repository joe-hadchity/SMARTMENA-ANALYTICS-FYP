export function shortId(id) {
  if (!id || typeof id !== "string") return "";
  if (id.length < 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

export function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtPercent(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function fmtNumber(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

export function fmtMoney(value) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}
