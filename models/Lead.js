import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    // Contact person can now be a reference OR null (for manual entries)
    contactPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
      required: function() {
        // Only required if not manual entry and not updating an existing record
        return !this.isManualEntry && !this._id;
      }
    },
    // New field for storing manually entered contact person name
    contactPersonName: {
      type: String,
      trim: true,
      required: function() {
        // Only required if manual entry
        return this.isManualEntry;
      }
    },
    // Flag to indicate if this is a manual entry
    isManualEntry: {
      type: Boolean,
      default: false
    },
    company: {
      type: String,
      required: true,
      trim: true
    },
    // Country dropdown
    country: {
      type: String,
      enum: ["Argentina", "Australia", "Canada", "Croatia", "New Zealand", "USA"],
      default: "Australia"
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    // Currency code field
    currencyCode: {
      type: String,
      default: "AUD",
      enum: ["AUD", "USD", "EUR", "GBP", "JPY", "CAD", "CNY", "INR", "NZD"]
    },
    // AUD value field - this will store the converted value
    audValue: {
      type: Number,
      min: 0,
      default: function() {
        // If currency is AUD or no currency is specified, use the original value
        if (!this.currencyCode || this.currencyCode === 'AUD') {
          return this.value;
        }
        // Otherwise, this will be set explicitly
        return null;
      }
    },
    stage: {
      type: String,
      required: true,
      enum: [
        "New Lead",
        "Contacted",
        "Qualified",
        "Demo Done",
        "Proposal Sent",
        "Negotiation",
        "Won - Deal Closed",
        "Lost - Not Interested",
        "Lost - Competitor Win",
        "Lost - No Budget",
        "Follow-up Later"
      ],
      default: "New Lead"
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium"
    },
    notes: {
      type: String,
      trim: true
    },
    // Next Step field
    nextStep: {
      type: String,
      trim: true
    },
    leadOwner: {
      type: String,
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Add index for efficient querying
leadSchema.index({ company: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ isManualEntry: 1 });
leadSchema.index({ country: 1 });

// Pre-save middleware to ensure audValue is set if not manually provided
leadSchema.pre('save', function(next) {
  // If audValue is not set and currency is AUD, use the original value
  if (this.audValue === undefined || this.audValue === null) {
    if (!this.currencyCode || this.currencyCode === 'AUD') {
      this.audValue = this.value;
    }
  }
  next();
});

// Virtual method to get contact name regardless of entry method
leadSchema.virtual('contactName').get(function() {
  if (this.isManualEntry) {
    return this.contactPersonName || 'Unknown Contact';
  } else if (this.contactPerson && typeof this.contactPerson === 'object') {
    return this.contactPerson.name || 'Unknown Contact';
  }
  return 'Unknown Contact';
});

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;