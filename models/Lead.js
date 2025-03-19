import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    contactPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: [true, "Contact person is required"],
    },
    company: {
      type: String,
      trim: true,
      // No longer required as it will be fetched from the contact
    },
    value: {
      type: Number,
      required: [true, "Value is required"],
    },
    stage: {
      type: String,
      required: [true, "Stage is required"],
      enum: ["New Lead", "Qualified", "Proposal", "Negotiation", "Closed Won"],
      default: "New Lead",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: new mongoose.Types.ObjectId("000000000000000000000000"),
    },
  },
  { timestamps: true }
);

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;