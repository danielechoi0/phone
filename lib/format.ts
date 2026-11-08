export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", ...opts });
}
