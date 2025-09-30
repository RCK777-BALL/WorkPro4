import { ObjectId } from 'mongodb';

type HexStringConvertible = { toHexString(): unknown };
type WithIdProperty = { id?: unknown; _id?: unknown };
type ExtendedJsonObjectId = { $oid?: unknown };

export type NormalizableObjectId =
  | ObjectId
  | string
  | HexStringConvertible
  | WithIdProperty
  | ExtendedJsonObjectId;

const HEX_24_REGEX = /^[a-f\d]{24}$/i;
const MAX_PREVIEW_STRING_LENGTH = 60;

function hasToHexString(value: unknown): value is HexStringConvertible {
  return Boolean(value && typeof (value as HexStringConvertible).toHexString === 'function');
}

function createPreview(value: unknown): string {
  const seen = new WeakSet<object>();

  try {
    const result = JSON.stringify(
      value,
      (_key, serializedValue) => {
        if (typeof serializedValue === 'string' && serializedValue.length > MAX_PREVIEW_STRING_LENGTH) {
          return `${serializedValue.slice(0, MAX_PREVIEW_STRING_LENGTH - 1)}…`;
        }

        if (typeof serializedValue === 'object' && serializedValue !== null) {
          if (seen.has(serializedValue)) {
            return '[Circular]';
          }

          seen.add(serializedValue);
        }

        return serializedValue;
      },
    );

    if (typeof result === 'string') {
      return result;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown serialization error';
    return `[Unserializable value: ${message}]`;
  }

  return String(value);
}

function failToNormalize(label: string, value: unknown, reason: string): never {
  const displayLabel = label || 'ObjectId';
  const preview = createPreview(value);

  console.error(
    `[normalizeObjectId] Failed to normalize "${displayLabel}": ${reason}. Value preview: ${preview}`,
  );

  throw new TypeError(`Unable to normalize ObjectId for "${displayLabel}".`);
}

function validateAndFormatHex(hex: string, label: string): string {
  const trimmed = hex.trim();

  if (!HEX_24_REGEX.test(trimmed)) {
    failToNormalize(label, hex, 'Expected a 24-character hexadecimal string');

  }

  return trimmed.toLowerCase();
}

export function normalizeObjectId(value: NormalizableObjectId, label = 'ObjectId'): string {
  const visited = new Set<unknown>();

  const normalize = (input: unknown, currentLabel: string): string => {
    if (input instanceof ObjectId) {
      return validateAndFormatHex(input.toHexString(), currentLabel);
    }

    if (typeof input === 'string') {
      return validateAndFormatHex(input, currentLabel);

    }

    if (hasToHexString(input)) {
      const result = input.toHexString();

      if (typeof result === 'string') {
        return validateAndFormatHex(result, currentLabel);
      }

      failToNormalize(currentLabel, result, 'toHexString() did not return a string');
    }

    if (input && typeof input === 'object') {
      if (visited.has(input)) {
        failToNormalize(currentLabel, input, 'Encountered a circular reference');
      }

      visited.add(input);

      const candidate = input as WithIdProperty & ExtendedJsonObjectId;

      if (candidate.$oid != null) {
        return normalize(candidate.$oid, `${currentLabel}.$oid`);
      }

      if (candidate.id != null) {
        return normalize(candidate.id, `${currentLabel}.id`);
      }

      if (candidate._id != null) {
        return normalize(candidate._id, `${currentLabel}._id`);
      }

    }

    failToNormalize(currentLabel, input, 'Value could not be interpreted as an ObjectId');
  };


  return normalize(value, label);
}
