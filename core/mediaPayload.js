export function stripInlineBase64(value) {
  if (Array.isArray(value)) {
    return value.map(stripInlineBase64);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce((acc, [key, child]) => {
    if (key === 'base64') return acc;
    acc[key] = stripInlineBase64(child);
    return acc;
  }, {});
}

function isHeavyMediaString(value) {
  if (typeof value !== 'string') return false;
  return /^data:image\/[^;]+;base64,/i.test(value) || value.length > 180000;
}

export function stripHeavyMediaForStorage(value) {
  if (Array.isArray(value)) {
    return value.map(stripHeavyMediaForStorage);
  }

  if (isHeavyMediaString(value)) {
    return 'midia_removida_do_armazenamento_web';
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce((acc, [key, child]) => {
    if (key === 'base64') return acc;
    acc[key] = stripHeavyMediaForStorage(child);
    return acc;
  }, {});
}
