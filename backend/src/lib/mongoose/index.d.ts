export interface Connection {
  readonly readyState: number;
  readonly name: string;
  readonly host: string;
  close(): Promise<void>;
}

export class Schema<T = any> {
  constructor(definition: Record<string, unknown>, options?: Record<string, unknown>);
}

export interface Document {
  id: string;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Model<T extends Record<string, unknown>> {
  findOne(filter: Partial<T>): Promise<(T & Document) | null>;
  findOneAndUpdate(
    filter: Partial<T>,
    update: { $set?: Partial<T> },
    options?: { upsert?: boolean; new?: boolean },
  ): Promise<(T & Document) | null>;
}

export interface Mongoose {
  connection: Connection;
  connect(uri: string): Promise<Connection>;
  set(key: string, value: unknown): Connection;
  model<T extends Record<string, unknown>>(name: string, schema: Schema<T>): Model<T>;
  Schema: typeof Schema;
}

declare const mongoose: Mongoose;

export default mongoose;
export { Schema, type Connection, type Document, type Model };
