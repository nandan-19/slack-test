
// models/MeetingSummary.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IMeetingSummary extends Document {
  userId: string;
  meetingTitle: string;
  meetingStart?: Date;
  meetingEnd?: Date;
  attendees?: string[];
  sections: {
    agenda: string;
    jira: string;
    slack: string;
    blockers: string;
    actions: string;
    overall: string;
  };
  sources: {
    jiraIssueKeys: string[];
    slackChannels: string[];
  };
  rawPrompt?: string;
  rawResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSummarySchema = new Schema<IMeetingSummary>({
  userId: { type: String, index: true },
  meetingTitle: String,
  meetingStart: Date,
  meetingEnd: Date,
  attendees: [String],
  sections: {
    agenda: String,
    jira: String,
    slack: String,
    blockers: String,
    actions: String,
    overall: String
  },
  sources: {
    jiraIssueKeys: [String],
    slackChannels: [String]
  },
  rawPrompt: String,
  rawResponse: String
}, { timestamps: true });

export default mongoose.models.MeetingSummary ||
  mongoose.model<IMeetingSummary>("MeetingSummary", MeetingSummarySchema);
