import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create base uploads directory if it doesn't exist
const uploadsBaseDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

// Create specific directories for different types of uploads
const createUploadDirectories = () => {
  const directories = [
    'chargeables',
    'leads',
    'contacts',
    'tasks',
    'profiles'
  ];
  
  directories.forEach(dir => {
    const dirPath = path.join(uploadsBaseDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

// Create upload directories on server start
createUploadDirectories();

// Configure file upload middleware with default options
const fileUploadMiddleware = fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: path.join(uploadsBaseDir, 'temp')
});

export default fileUploadMiddleware;