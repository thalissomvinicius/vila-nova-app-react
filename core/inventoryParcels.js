import inventoryData from '../assets/data/inventory-parcels.json';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function normalizeParcel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim();
}

const records = Array.isArray(inventoryData?.records) ? inventoryData.records : [];

export function getParcelsByFarm(farmName) {
  const normalizedFarm = normalizeText(farmName);
  if (!normalizedFarm) return [];

  const seen = new Set();
  return records
    .filter((record) => normalizeText(record.farmName) === normalizedFarm)
    .map((record) => ({
      id: record.id,
      label: normalizeParcel(record.parcel),
      parcel: normalizeParcel(record.parcel),
      block: record.block,
      year: record.year,
      cultivar: record.cultivar,
      plants: record.plants,
      areaHa: record.areaHa,
    }))
    .filter((record) => {
      if (!record.parcel || seen.has(record.parcel)) return false;
      seen.add(record.parcel);
      return true;
    })
    .sort((a, b) => a.parcel.localeCompare(b.parcel, 'pt-BR', { numeric: true }));
}

export function isValidParcelForFarm(farmName, parcel) {
  const normalizedParcel = normalizeParcel(parcel);
  if (!normalizedParcel) return false;
  return getParcelsByFarm(farmName).some((record) => record.parcel === normalizedParcel);
}

export function formatParcelValue(value) {
  return normalizeParcel(value);
}
