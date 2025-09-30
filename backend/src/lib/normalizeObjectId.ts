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

function buildInvalidIdMessage(value: string, fieldName?: string): string {
  const suffix = fieldName ? ` for "${fieldName}"` : '';

  return `Invalid ObjectId string provided${suffix}: "${value}"`;
}

function validateAndFormatHex(hex: string, fieldName?: string): string {
  const trimmed = hex.trim();

  if (!HEX_24_REGEX.test(trimmed)) {
    throw new TypeError(buildInvalidIdMessage(trimmed, fieldName));
  }

  return trimmed.toLowerCase();
}

export function normalizeObjectId(value: NormalizableObjectId, fieldName?: string): string {
  if (value instanceof ObjectId) {
    return validateAndFormatHex(value.toHexString(), fieldName);
  }

  if (typeof value === 'string') {
    return validateAndFormatHex(value, fieldName);
  }

  if (hasToHexString(value)) {
    const result = value.toHexString();

    if (typeof result === 'string') {
      return validateAndFormatHex(result, fieldName);
    }
  }

  if (isWithIdProperty(value)) {
    if (value.id != null) {
      return normalizeObjectId(value.id as NormalizableObjectId, fieldName);
    }

    if (value._id != null) {
      return normalizeObjectId(value._id as NormalizableObjectId, fieldName);
    }
  }

  const typeDescription = value === null ? 'null' : typeof value;
  const errorContext = fieldName ? ` for "${fieldName}"` : '';
  console.error(
    `[normalizeObjectId] Unable to normalize value${errorContext} of type:`,
    typeDescription,
    value,
  );

  throw new TypeError('Unable to normalize provided ObjectId value');
}
