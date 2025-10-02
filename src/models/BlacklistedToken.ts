import mongoose, { Schema, Document } from 'mongoose';

export interface IBlacklistedToken extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  reason: string;
  createdAt: Date;
}

const BlacklistedTokenSchema: Schema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index
  },
  reason: {
    type: String,
    enum: ['logout', 'password_change', 'security_breach'],
    default: 'logout'
  }
}, {
  timestamps: true
});

// Index for faster lookups
BlacklistedTokenSchema.index({ token: 1 });
BlacklistedTokenSchema.index({ userId: 1 });

export default mongoose.model<IBlacklistedToken>('BlacklistedToken', BlacklistedTokenSchema);