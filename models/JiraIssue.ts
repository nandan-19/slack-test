
// models/JiraIssue.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IJiraIssue extends Document {
  userId: string;
  cloudId: string;
  issueKey: string;
  projectKey: string;
  title: string;
  state: string;
  priority?: string;
  type?: string;
  assignee?: string;
  reporter?: string;
  labels?: string[];
  createdAtISO: string;
  updatedAtISO: string;
  raw: any;
}

const JiraIssueSchema = new Schema<IJiraIssue>({
  userId: { type: String, index: true },
  cloudId: { type: String, index: true },
  issueKey: { type: String, index: true },
  projectKey: String,
  title: String,
  state: String,
  priority: String,
  type: String,
  assignee: String,
  reporter: String,
  labels: [String],
  createdAtISO: String,
  updatedAtISO: { type: String, index: true },
  raw: Schema.Types.Mixed,
}, { timestamps: true });

JiraIssueSchema.index({ userId: 1, cloudId: 1, issueKey: 1 }, { unique: true });

export default mongoose.models.JiraIssue ||
  mongoose.model<IJiraIssue>("JiraIssue", JiraIssueSchema);
