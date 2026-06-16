export function normalizeIntegerInput(text) {
  if (text === null || text === undefined) return '';
  const clean = String(text).replace(/\D/g, '');
  if (!clean) return '';
  const stripped = clean.replace(/^0+(?=\d)/, '');
  return stripped === '' ? '0' : stripped;
}

export function readIntegerInput(value) {
  const normalized = normalizeIntegerInput(value);
  if (!normalized) return 0;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
