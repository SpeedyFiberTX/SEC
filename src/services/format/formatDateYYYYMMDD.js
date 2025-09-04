export default function formatDateYYYYMMDD(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return [`${y}-${m}-${day}`, `${y}${m}${day}`];
}