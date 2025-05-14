import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
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
} from '../controllers/chargeableController.js';
import {
  getChargeableAuditLogs,
  getAllAuditLogs,
  getUserAuditLogs,
  searchAuditLogs
} from '../controllers/chargeableAuditController.js';

const router = express.Router();

// Chargeables routes
router.route('/')
  .get(authMiddleware, getChargeables)
  .post(authMiddleware, createChargeable);

router.route('/:id')
  .get(authMiddleware, getChargeableById)
  .put(authMiddleware, updateChargeable)
  .delete(authMiddleware, deleteChargeable);

// Attachment routes
router.route('/:id/attachments')
  .post(authMiddleware, upload.array('files', 5), uploadAttachment);

router.route('/:id/attachments/:attachmentId')
  .get(authMiddleware, downloadAttachment)
  .delete(authMiddleware, deleteAttachment);

// Search routes
router.get('/search', authMiddleware, searchChargeables);
router.get('/customer/:customerName', authMiddleware, getChargeablesByCustomer);

// Dropdown data for UI
router.get('/dropdown/customers', authMiddleware, getCustomerDropdown);

// Audit log routes
router.get('/audit/:id', authMiddleware, getChargeableAuditLogs);
router.get('/audit', authMiddleware, getAllAuditLogs);
router.get('/audit/user/:userId', authMiddleware, getUserAuditLogs);
router.get('/audit/search', authMiddleware, searchAuditLogs);

export { router };