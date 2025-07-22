// models/User.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name?: string;
  email: string;
  image?: string;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  image: {
    type: String,
    required: false,
  },
  googleId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  lastLoginAt: {
    type: Date,
    required: false,
  },
}, {
  timestamps: true,
});

// Prevent re-compilation error in development
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
