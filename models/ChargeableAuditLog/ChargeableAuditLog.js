import mongoose from 'mongoose';

const chargeableAuditLogSchema = mongoose.Schema({
  chargeableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chargeable',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
        type: mongoose.Schema.Types.Mixed
      },
      newValue: {
        type: mongoose.Schema.Types.Mixed
      }
    }
  ],
  action: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true
  }
});

const ChargeableAuditLog = mongoose.model('ChargeableAuditLog', chargeableAuditLogSchema);

export default ChargeableAuditLog;