import mongoose from "mongoose";

// Schema for individual changes
const changeSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true
  },
  oldValue: {
    type: String,
    default: ""
  },
  newValue: {
    type: String,
    default: ""
  }
});

// Main audit log schema
const leadAuditLogSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  userName: {
    type: String,
    default: "System User"
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  changes: [changeSchema]
});

// Add indexes for quick retrieval
leadAuditLogSchema.index({ leadId: 1 });
leadAuditLogSchema.index({ timestamp: -1 });

const LeadAuditLog = mongoose.model("LeadAuditLog", leadAuditLogSchema);

export default LeadAuditLog;