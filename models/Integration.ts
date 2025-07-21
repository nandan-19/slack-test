
// models/Integration.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IIntegration extends Document {
  userId: string;             // Your app user ID (placeholder if no auth yet)
  provider: "jira";
  cloudId: string;
  siteName: string;
  siteUrl: string;
  scopes: string[];
  accessTokenEnc: string;     // encrypted
  refreshTokenEnc?: string;   // encrypted
  expiresAt: Date;            // token expiry
  lastSyncAt?: Date;
  lastUpdatedCursor?: string; // last Jira issue updated timestamp
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>({
  userId: { type: String, index: true },
  provider: { type: String, index: true },
  cloudId: { type: String, index: true },
  siteName: String,
  siteUrl: String,
  scopes: [String],
  accessTokenEnc: String,
  refreshTokenEnc: String,
  expiresAt: Date,
  lastSyncAt: Date,
  lastUpdatedCursor: String,
}, { timestamps: true });

IntegrationSchema.index({ userId: 1, provider: 1, cloudId: 1 }, { unique: true });

export default mongoose.models.Integration ||
  mongoose.model<IIntegration>("Integration", IntegrationSchema);
