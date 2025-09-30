import { ObjectId } from 'mongodb';

type HexStringConvertible = { toHexString(): unknown };
type WithIdProperty = { id?: unknown; _id?: unknown };

export type NormalizableObjectId = ObjectId | string | HexStringConvertible | WithIdProperty;

const HEX_24_REGEX = /^[a-f\d]{24}$/i;

function hasToHexString(value: unknown): value is HexStringConvertible {
  return Boolean(value && typeof (value as HexStringConvertible).toHexString === 'function');
}

function isWithIdProperty(value: unknown): value is WithIdProperty {
  return Boolean(value && typeof value === 'object' && ('id' in (value as WithIdProperty) || '_id' in (value as WithIdProperty)));
}

function validateAndFormatHex(hex: string): string {
  const trimmed = hex.trim();

  if (!HEX_24_REGEX.test(trimmed)) {
    throw new TypeError(`Invalid ObjectId string provided: "${trimmed}"`);
  }

  return trimmed.toLowerCase();
}

export function normalizeObjectId(value: NormalizableObjectId): string {
  if (value instanceof ObjectId) {
    return validateAndFormatHex(value.toHexString());
  }

  if (typeof value === 'string') {
    return validateAndFormatHex(value);
  }

  if (hasToHexString(value)) {
    const result = value.toHexString();

    if (typeof result === 'string') {
      return validateAndFormatHex(result);
    }
  }

  if (isWithIdProperty(value)) {
    if (value.id != null) {
      return normalizeObjectId(value.id as NormalizableObjectId);
    }

    if (value._id != null) {
      return normalizeObjectId(value._id as NormalizableObjectId);
    }
  }

  const typeDescription = value === null ? 'null' : typeof value;
  console.error('[normalizeObjectId] Unable to normalize value of type:', typeDescription, value);

  throw new TypeError('Unable to normalize provided ObjectId value');
}
