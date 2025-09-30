import { ObjectId } from 'mongodb';

const HEX_24_REGEX = /^[a-f\d]{24}$/i;

export function normalizeToObjectIdString(input: unknown): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();

    if (HEX_24_REGEX.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    throw new TypeError(`Invalid ObjectId string: "${trimmed}"`);
  }

  if (input instanceof ObjectId) {
    return input.toHexString();
  }

  if (input && typeof input === 'object') {
    const candidate = input as { toHexString?: () => unknown; _id?: unknown };

    if (typeof candidate.toHexString === 'function') {
      const hex = candidate.toHexString();

      if (typeof hex === 'string') {
        return normalizeToObjectIdString(hex);
      }
    }

    if ('_id' in candidate) {
      return normalizeToObjectIdString(candidate._id);
    }
  }

  throw new TypeError('Unsupported ObjectId input');
}
