import mongoose from 'mongoose';

const chargeableSchema = mongoose.Schema({
  quoteSendDate: {
    type: Date,
    required: [true, 'Quote send date is required']
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required']
  },
  // Reference to Contact if selected from dropdown
  contactPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    default: null
  },
  chargeableType: {
    type: String,
    required: [true, 'Chargeable type is required']
  },
  quotationSent: {
    type: String,
    enum: ['yes', 'no', 'pending'],
    default: 'no'
  },
  followUps: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required']
  },
  currencyCode: {
    type: String,
    default: 'AUD'
  },
  poReceived: {
    type: String,
    enum: ['yes', 'no', 'pending'],
    default: 'no'
  },
  invoiceSent: {
    type: String,
    enum: ['yes', 'no', 'pending'],
    default: 'no'
  },
  paymentReceived: {
    type: String,
    enum: ['yes', 'no', 'pending'],
    default: 'no'
  },
  attachments: [
    {
      fileName: String,
      filePath: String, // Cloudinary URL
      cloudinaryId: String, // Cloudinary public_id for deletion
      fileType: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add text index for search functionality
chargeableSchema.index({ 
  customerName: 'text', 
  chargeableType: 'text' 
});

const Chargeable = mongoose.model('Chargeable', chargeableSchema);

export default Chargeable;