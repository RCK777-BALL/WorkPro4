import mongoose, { Schema, type Document } from '../lib/mongoose';

export interface UserDoc extends Document {
  [key: string]: unknown;
  email: string;
  passwordHash: string;
  name?: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user', required: true },
  },
  { timestamps: true },
);

export default mongoose.model<UserDoc>('User', UserSchema);
