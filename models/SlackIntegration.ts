// models/SlackIntegration.ts
import mongoose from 'mongoose';

export interface ISlackIntegration {
  userId: string; // Keep this for Slack user ID
  nextAuthUserId: string; // Add this for session.user.id
  teamId: string;
  teamName: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  scopes: string[];
  connectedAt: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}

const SlackIntegrationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  nextAuthUserId: { // Add this field
    type: String,
    required: true,
    index: true,
  },
  teamId: {
    type: String,
    required: true,
    index: true,
  },
  teamName: {
    type: String,
    required: true,
  },
  encryptedAccessToken: {
    type: String,
    required: true,
  },
  encryptedRefreshToken: {
    type: String,
    required: false,
  },
  scopes: [{
    type: String,
  }],
  connectedAt: {
    type: Date,
    default: Date.now,
  },
  lastUsedAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Update compound index
SlackIntegrationSchema.index({ nextAuthUserId: 1, teamId: 1 }, { unique: true });

export default mongoose.models.SlackIntegration || mongoose.model('SlackIntegration', SlackIntegrationSchema);
