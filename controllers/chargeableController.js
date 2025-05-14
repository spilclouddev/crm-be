import asyncHandler from 'express-async-handler';
import Chargeable from '../models/Chargeable.js';
import ChargeableAuditLog from '../models/ChargeableAuditLog/ChargeableAuditLog.js';
import Contact from '../models/Contact.js';
import cloudinary from '../config/cloudinaryConfig.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up multer for temporary file storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

// Define upload without exporting it here (moved to the export list at the end)
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only supported file formats allowed'));
  }
});

// @desc    Get all chargeables
// @route   GET /api/chargeables
// @access  Private
const getChargeables = asyncHandler(async (req, res) => {
  const chargeables = await Chargeable.find({})
    .populate('contactPerson', 'name company')
    .sort({ createdAt: -1 });
  
  res.status(200).json(chargeables);
});

// @desc    Get a chargeable by ID
// @route   GET /api/chargeables/:id
// @access  Private
const getChargeableById = asyncHandler(async (req, res) => {
  const chargeable = await Chargeable.findById(req.params.id)
    .populate('contactPerson', 'name company email phone');
  
  if (!chargeable) {
    res.status(404);
    throw new Error('Chargeable not found');
  }
  
  res.status(200).json(chargeable);
});

// @desc    Create a new chargeable
// @route   POST /api/chargeables
// @access  Private
const createChargeable = asyncHandler(async (req, res) => {
  const {
    quoteSendDate,
    customerName,
    contactPerson,
    chargeableType,
    quotationSent,
    followUps,
    amount,
    currencyCode,
    poReceived,
    invoiceSent,
    paymentReceived
  } = req.body;
  
  // Validate required fields
  if (!quoteSendDate || !customerName || !chargeableType || !amount) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }
  
  // Create the chargeable
  const chargeable = await Chargeable.create({
    quoteSendDate,
    customerName,
    contactPerson,
    chargeableType,
    quotationSent: quotationSent || 'no',
    followUps: followUps || 0,
    amount,
    currencyCode: currencyCode || 'AUD',
    poReceived: poReceived || 'no',
    invoiceSent: invoiceSent || 'no',
    paymentReceived: paymentReceived || 'no',
    attachments: [],
    createdBy: req.user._id,
    updatedBy: req.user._id
  });
  
  // Create audit log for creation
  await ChargeableAuditLog.create({
    chargeableId: chargeable._id,
    userId: req.user._id,
    userName: req.user.name || 'System User',
    action: 'create',
    changes: [
      {
        field: 'all',
        oldValue: null,
        newValue: 'Chargeable created'
      }
    ]
  });
  
  res.status(201).json(chargeable);
});

// @desc    Update a chargeable
// @route   PUT /api/chargeables/:id
// @access  Private
const updateChargeable = asyncHandler(async (req, res) => {
  const chargeable = await Chargeable.findById(req.params.id);
  
  if (!chargeable) {
    res.status(404);
    throw new Error('Chargeable not found');
  }
  
  const {
    quoteSendDate,
    customerName,
    contactPerson,
    chargeableType,
    quotationSent,
    followUps,
    amount,
    currencyCode,
    poReceived,
    invoiceSent,
    paymentReceived
  } = req.body;
  
  // Store original values for audit log
  const originalValues = {
    quoteSendDate: chargeable.quoteSendDate,
    customerName: chargeable.customerName,
    contactPerson: chargeable.contactPerson,
    chargeableType: chargeable.chargeableType,
    quotationSent: chargeable.quotationSent,
    followUps: chargeable.followUps,
    amount: chargeable.amount,
    currencyCode: chargeable.currencyCode,
    poReceived: chargeable.poReceived,
    invoiceSent: chargeable.invoiceSent,
    paymentReceived: chargeable.paymentReceived
  };
  
  // Update chargeable fields
  chargeable.quoteSendDate = quoteSendDate || chargeable.quoteSendDate;
  chargeable.customerName = customerName || chargeable.customerName;
  chargeable.contactPerson = contactPerson === null ? null : (contactPerson || chargeable.contactPerson);
  chargeable.chargeableType = chargeableType || chargeable.chargeableType;
  chargeable.quotationSent = quotationSent || chargeable.quotationSent;
  chargeable.followUps = followUps !== undefined ? followUps : chargeable.followUps;
  chargeable.amount = amount !== undefined ? amount : chargeable.amount;
  chargeable.currencyCode = currencyCode || chargeable.currencyCode;
  chargeable.poReceived = poReceived || chargeable.poReceived;
  chargeable.invoiceSent = invoiceSent || chargeable.invoiceSent;
  chargeable.paymentReceived = paymentReceived || chargeable.paymentReceived;
  chargeable.updatedBy = req.user._id;
  
  // Save the updated chargeable
  const updatedChargeable = await chargeable.save();
  
  // Track changes for audit log
  const changes = [];
  
  for (const [field, newValue] of Object.entries(updatedChargeable.toObject())) {
    if (['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'attachments'].includes(field)) {
      continue;
    }
    
    const oldValue = originalValues[field];
    
    if (field === 'contactPerson') {
      // Handle ObjectId comparison
      const oldId = oldValue ? oldValue.toString() : null;
      const newId = newValue ? newValue.toString() : null;
      
      if (oldId !== newId) {
        changes.push({
          field,
          oldValue: oldId,
          newValue: newId
        });
      }
    } 
    else if (field === 'quoteSendDate') {
      // Handle date comparison
      const oldDate = oldValue ? oldValue.toISOString() : null;
      const newDate = newValue ? new Date(newValue).toISOString() : null;
      
      if (oldDate !== newDate) {
        changes.push({
          field,
          oldValue: oldDate,
          newValue: newDate
        });
      }
    }
    else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        oldValue,
        newValue
      });
    }
  }
  
  // Create audit log for update if changes were made
  if (changes.length > 0) {
    await ChargeableAuditLog.create({
      chargeableId: chargeable._id,
      userId: req.user._id,
      userName: req.user.name || 'System User',
      action: 'update',
      changes
    });
  }
  
  res.status(200).json(updatedChargeable);
});

// @desc    Delete a chargeable
// @route   DELETE /api/chargeables/:id
// @access  Private
const deleteChargeable = asyncHandler(async (req, res) => {
  const chargeable = await Chargeable.findById(req.params.id);
  
  if (!chargeable) {
    res.status(404);
    throw new Error('Chargeable not found');
  }
  
  // Delete files from Cloudinary if they exist
  if (chargeable.attachments && chargeable.attachments.length > 0) {
    for (const attachment of chargeable.attachments) {
      if (attachment.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(attachment.cloudinaryId);
        } catch (error) {
          console.error('Error deleting file from Cloudinary:', error);
        }
      }
    }
  }
  
  // Create audit log for deletion
  await ChargeableAuditLog.create({
    chargeableId: chargeable._id,
    userId: req.user._id,
    userName: req.user.name || 'System User',
    action: 'delete',
    changes: [
      {
        field: 'status',
        oldValue: 'Active',
        newValue: 'Deleted'
      }
    ]
  });
  
  // Remove chargeable
  await chargeable.deleteOne();
  
  res.status(200).json({ message: 'Chargeable removed' });
});

// @desc    Get chargeables by customer name
// @route   GET /api/chargeables/customer/:customerName
// @access  Private
const getChargeablesByCustomer = asyncHandler(async (req, res) => {
  const customerName = decodeURIComponent(req.params.customerName);
  
  const chargeables = await Chargeable.find({ customerName })
    .populate('contactPerson', 'name company')
    .sort({ createdAt: -1 });
  
  res.status(200).json(chargeables);
});

// @desc    Search chargeables
// @route   GET /api/chargeables/search
// @access  Private
const searchChargeables = asyncHandler(async (req, res) => {
  const { term } = req.query;
  
  if (!term) {
    res.status(400);
    throw new Error('Search term is required');
  }
  
  // Create text search query
  const chargeables = await Chargeable.find(
    { $text: { $search: term } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .populate('contactPerson', 'name company');
  
  res.status(200).json(chargeables);
});

// @desc    Get customer dropdown data
// @route   GET /api/chargeables/dropdown/customers
// @access  Private
const getCustomerDropdown = asyncHandler(async (req, res) => {
  // Get unique customer names from chargeables
  const chargeables = await Chargeable.aggregate([
    { $group: { _id: '$customerName' } },
    { $sort: { _id: 1 } },
    { $project: { name: '$_id', _id: 0 } }
  ]);
  
  // Also get customer names from contacts
  const contacts = await Contact.aggregate([
    { $group: { _id: '$company' } },
    { $sort: { _id: 1 } },
    { $project: { name: '$_id', _id: 0 } }
  ]);
  
  // Merge and remove duplicates
  const allCustomers = [...chargeables, ...contacts];
  const uniqueCustomers = Array.from(new Set(allCustomers.map(c => c.name)))
    .filter(name => name && name.trim() !== '')
    .sort()
    .map(name => ({ name }));
  
  res.status(200).json(uniqueCustomers);
});

// @desc    Upload attachment to a chargeable
// @route   POST /api/chargeables/:id/attachments
// @access  Private
const uploadAttachment = asyncHandler(async (req, res) => {
  console.log('Upload attachment request received for chargeable ID:', req.params.id);
  
  const chargeable = await Chargeable.findById(req.params.id);
  
  if (!chargeable) {
    // Clean up temp files
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(404);
    throw new Error('Chargeable not found');
  }
  
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('No files uploaded');
  }
  
  console.log(`Processing ${req.files.length} files for upload`);
  
  try {
    const uploadPromises = req.files.map(async (file) => {
      console.log(`Uploading file: ${file.originalname} (${file.mimetype})`);
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'chargeables',
        resource_type: 'auto',
        public_id: `${req.params.id}/${path.parse(file.originalname).name}-${Date.now()}`
      });
      
      console.log(`Cloudinary upload successful: ${result.public_id}`);
      
      // Remove temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`Temporary file removed: ${file.path}`);
      }
      
      return {
        fileName: file.originalname,
        filePath: result.secure_url,
        fileType: file.mimetype,
        cloudinaryId: result.public_id,
        uploadDate: new Date()
      };
    });
    
    const uploadedFiles = await Promise.all(uploadPromises);
    console.log(`Successfully uploaded ${uploadedFiles.length} files`);
    
    // Add the new attachments to the chargeable
    chargeable.attachments = [...chargeable.attachments, ...uploadedFiles];
    await chargeable.save();
    
    // Create audit log for attachment upload
    await ChargeableAuditLog.create({
      chargeableId: chargeable._id,
      userId: req.user._id,
      userName: req.user.name || 'System User',
      action: 'update',
      changes: [
        {
          field: 'attachments',
          oldValue: 'Previous attachments',
          newValue: `Added ${uploadedFiles.length} attachments`
        }
      ]
    });
    
    res.status(200).json(chargeable);
  } catch (error) {
    // Clean up any temp files in case of error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    console.error('File upload error:', error);
    res.status(500);
    throw new Error(`Error uploading files: ${error.message}`);
  }
});

// @desc    Delete attachment from a chargeable
// @route   DELETE /api/chargeables/:id/attachments/:attachmentId
// @access  Private
const deleteAttachment = asyncHandler(async (req, res) => {
  const chargeable = await Chargeable.findById(req.params.id);
  
  if (!chargeable) {
    res.status(404);
    throw new Error('Chargeable not found');
  }
  
  // Find the attachment by ID
  const attachmentIndex = chargeable.attachments.findIndex(
    att => att._id.toString() === req.params.attachmentId
  );
  
  if (attachmentIndex === -1) {
    res.status(404);
    throw new Error('Attachment not found');
  }
  
  const attachment = chargeable.attachments[attachmentIndex];
  
  try {
    // Delete from Cloudinary if cloudinaryId exists
    if (attachment.cloudinaryId) {
      await cloudinary.uploader.destroy(attachment.cloudinaryId);
    }
    
    // Remove from array
    chargeable.attachments.splice(attachmentIndex, 1);
    await chargeable.save();
    
    // Create audit log for attachment deletion
    await ChargeableAuditLog.create({
      chargeableId: chargeable._id,
      userId: req.user._id,
      userName: req.user.name || 'System User',
      action: 'update',
      changes: [
        {
          field: 'attachments',
          oldValue: attachment.fileName,
          newValue: 'Attachment deleted'
        }
      ]
    });
    
    res.status(200).json(chargeable);
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500);
    throw new Error('Error deleting attachment');
  }
});

// @desc    Download attachment
// @route   GET /api/chargeables/:id/attachments/:attachmentId
// @access  Private
const downloadAttachment = asyncHandler(async (req, res) => {
  const chargeable = await Chargeable.findById(req.params.id);
  
  if (!chargeable) {
    res.status(404);
    throw new Error('Chargeable not found');
  }
  
  // Find the attachment by ID
  const attachment = chargeable.attachments.find(
    att => att._id.toString() === req.params.attachmentId
  );
  
  if (!attachment) {
    res.status(404);
    throw new Error('Attachment not found');
  }
  
  // Redirect to the Cloudinary URL
  res.redirect(attachment.filePath);
});

export {
  getChargeables,
  getChargeableById,
  createChargeable,
  updateChargeable,
  deleteChargeable,
  getChargeablesByCustomer,
  searchChargeables,
  getCustomerDropdown,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
  upload
};