import mongoose from "mongoose";

// Address schema for both company address and contact person address
const addressSchema = new mongoose.Schema({
  country: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  addressLine1: {
    type: String,
    trim: true,
  },
  addressLine2: {
    type: String,
    trim: true,
  },
  postalCode: {
    type: String,
    trim: true,
  }
}, { _id: false });

// Contact person schema
const contactPersonSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    required: [true, "Contact person name is required"],
    trim: true,
  },
  designation: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  linkedin: {
    type: String,
    trim: true,
  },
  address: addressSchema,
  notes: {
    type: String,
    trim: true,
  }
}, { timestamps: true });

// Attachment schema for both company logo and general attachments
const attachmentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
  },
  cloudinaryId: {
    type: String, // Cloudinary public_id for deletion
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const contactSchema = new mongoose.Schema(
  {
    // Backward compatibility fields
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    
    // New fields
    contactType: {
      type: String,
      enum: ["prospect", "customer"],
      default: "prospect",
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    companyAddress: addressSchema,
    additionalDetails: {
      type: String,
      trim: true,
    },
    companyEmail: {
      type: String,
      required: [true, "Company email is required"],
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    contactPersons: [contactPersonSchema],
    companyLogo: attachmentSchema, // Single logo
    attachments: [attachmentSchema], // Multiple attachments
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: new mongoose.Types.ObjectId("000000000000000000000000"),
    },
  },
  { timestamps: true }
);

// Middleware to handle backward compatibility
contactSchema.pre('save', function(next) {
  // If using new fields but not old fields, map them for compatibility
  if (this.companyName && !this.company) {
    this.company = this.companyName;
  }
  if (this.companyEmail && !this.email) {
    this.email = this.companyEmail;
  }
  if (this.phoneNumber && !this.phone) {
    this.phone = this.phoneNumber;
  }
  
  // If first contact person exists and name field is empty, set it
  if (this.contactPersons && this.contactPersons.length > 0 && !this.name) {
    this.name = this.contactPersons[0].name;
  }
  
  next();
});

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;