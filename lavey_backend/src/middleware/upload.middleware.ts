import multer from 'multer';
import { MAX_CONTENT_BYTES } from '../constants/content.js';

export const contentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CONTENT_BYTES,
    files: 2,
  },
});
