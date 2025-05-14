import asyncHandler from 'express-async-handler';
import ChargeableAuditLog from '..//models/ChargeableAuditLog/ChargeableAuditLog.js';
import Chargeable from '../models/Chargeable.js';

// @desc    Get audit logs for a specific chargeable
// @route   GET /api/chargeables/audit/:id
// @access  Private
const getChargeableAuditLogs = asyncHandler(async (req, res) => {
  // Check if chargeable exists
  const chargeable = await Chargeable.findById(req.params.id);
  
  if (!chargeable) {
    res.status(404);
    throw new Error('Chargeable not found');
  }
  
  // Get audit logs for this chargeable
  const auditLogs = await ChargeableAuditLog.find({ chargeableId: req.params.id })
    .sort({ timestamp: -1 });
  
  res.status(200).json(auditLogs);
});

// @desc    Get all audit logs
// @route   GET /api/chargeables/audit
// @access  Private
const getAllAuditLogs = asyncHandler(async (req, res) => {
  // Implement pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  // Get total count for pagination info
  const total = await ChargeableAuditLog.countDocuments();
  
  // Get audit logs with pagination
  const auditLogs = await ChargeableAuditLog.find()
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('chargeableId', 'customerName chargeableType');
  
  res.status(200).json({
    auditLogs,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get audit logs by user
// @route   GET /api/chargeables/audit/user/:userId
// @access  Private
const getUserAuditLogs = asyncHandler(async (req, res) => {
  // Implement pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  // Get total count for pagination info
  const total = await ChargeableAuditLog.countDocuments({ userId: req.params.userId });
  
  // Get audit logs for specific user with pagination
  const auditLogs = await ChargeableAuditLog.find({ userId: req.params.userId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('chargeableId', 'customerName chargeableType');
  
  res.status(200).json({
    auditLogs,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Search audit logs
// @route   GET /api/chargeables/audit/search
// @access  Private
const searchAuditLogs = asyncHandler(async (req, res) => {
  const { startDate, endDate, action, userName } = req.query;
  
  // Build query object
  const query = {};
  
  if (startDate && endDate) {
    query.timestamp = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  } else if (startDate) {
    query.timestamp = { $gte: new Date(startDate) };
  } else if (endDate) {
    query.timestamp = { $lte: new Date(endDate) };
  }
  
  if (action) {
    query.action = action;
  }
  
  if (userName) {
    query.userName = { $regex: userName, $options: 'i' };
  }
  
  // Implement pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  // Get total count for pagination info
  const total = await ChargeableAuditLog.countDocuments(query);
  
  // Get audit logs with filtering and pagination
  const auditLogs = await ChargeableAuditLog.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('chargeableId', 'customerName chargeableType');
  
  res.status(200).json({
    auditLogs,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
});

export {
  getChargeableAuditLogs,
  getAllAuditLogs,
  getUserAuditLogs,
  searchAuditLogs
};