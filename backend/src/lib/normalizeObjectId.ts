import { ObjectId } from 'mongodb';

type HexStringConvertible = { toHexString(): string };

export type NormalizableObjectId = ObjectId | string | HexStringConvertible;

function hasToHexString(value: unknown): value is HexStringConvertible {
  return Boolean(value && typeof (value as HexStringConvertible).toHexString === 'function');
}

export function normalizeObjectId(value: NormalizableObjectId): string {
  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (hasToHexString(value)) {
    return value.toHexString();
  }

  if (typeof value === 'string') {
    if (!ObjectId.isValid(value)) {
      throw new Error('Invalid ObjectId string provided');
    }

    return new ObjectId(value).toHexString();
  }

  throw new Error('Unable to normalize provided ObjectId value');
}
