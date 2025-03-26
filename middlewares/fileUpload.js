import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Filter for allowed file types
const fileFilter = (req, file, cb) => {
  // Accept common image, document, and archive formats
  const allowedFileTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/svg+xml",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    // Archives
    "application/zip",
    "application/x-rar-compressed",
  ];

  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not supported"), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

// Middleware to handle file uploads
export const uploadSingle = (fieldName) => upload.single(fieldName);
export const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);
export const uploadFields = (fields) => upload.fields(fields);

// Export a middleware that can handle different upload scenarios
export const handleFileUpload = (req, res, next) => {
  // Determine upload type based on request
  const uploadType = req.query.uploadType || 'multiple';
  
  try {
    if (uploadType === 'single') {
      // For company logo
      upload.single('file')(req, res, (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        next();
      });
    } else if (uploadType === 'fields') {
      // For specific fields
      upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'attachments', maxCount: 5 }
      ])(req, res, (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        next();
      });
    } else {
      // Default: multiple files
      upload.array('files', 10)(req, res, (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        next();
      });
    }
  } catch (error) {
    res.status(500).json({ error: "File upload failed" });
  }
};

export default {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleFileUpload
};