import mongoose from "mongoose";

const leadAuditSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true // Add index for performance when querying by leadId
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    changes: [
      {
        field: {
          type: String,
          required: true
        },
        oldValue: {
          type: String
        },
        newValue: {
          type: String
        }
      }
    ]
  },
  { timestamps: false } // We're explicitly managing the timestamp field
);

// Create index on timestamp field for sorting audit logs by date
leadAuditSchema.index({ timestamp: -1 });

const LeadAuditLog = mongoose.model("LeadAuditLog", leadAuditSchema);

export default LeadAuditLog;