function normalizeFields(value) {
  if (Array.isArray(value)) {
    return value.filter((field) => field && typeof field === 'object' && field.id && field.tipo);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      return normalizeFields(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.campos)) return normalizeFields(value.campos);
    if (Array.isArray(value.fields)) return normalizeFields(value.fields);
  }

  return [];
}

export function parseCamposJson(value) {
  return normalizeFields(value);
}

export function stringifyCamposJson(value) {
  return JSON.stringify(normalizeFields(value));
}
