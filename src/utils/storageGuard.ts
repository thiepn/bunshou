/** R1 lossless-legacy normalization predicate; reused by M1. */
export function retainsOriginalData(original: unknown, normalized: unknown): boolean {
  if (Array.isArray(original)) {
    return Array.isArray(normalized) && original.length === normalized.length &&
      original.every((item, index) => retainsOriginalData(item, normalized[index]));
  }
  if (original !== null && typeof original === 'object') {
    if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) return false;
    const destination = normalized as Record<string, unknown>;
    return Object.entries(original as Record<string, unknown>)
      .every(([key, value]) => Object.prototype.hasOwnProperty.call(destination, key) &&
        retainsOriginalData(value, destination[key]));
  }
  return Object.is(original, normalized);
}

