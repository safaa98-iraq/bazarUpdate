import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const uploadRoot = process.env.UPLOAD_DIR ?? 'uploads';
const uploadsDir = path.isAbsolute(uploadRoot)
  ? uploadRoot
  : path.join(process.cwd(), uploadRoot);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed MIME types and their magic bytes (first bytes of file)
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Magic byte signatures
const MAGIC: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png':  [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif':  [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Only allow safe extensions
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      return cb(new Error('Invalid file extension'), '');
    }
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
  }
  // Sanitize original filename to prevent path traversal
  file.originalname = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.min(Number(process.env.MAX_FILE_SIZE ?? 5242880), 10485760), // max 10MB, default 5MB
    files: 5,
  },
});

// Post-upload magic byte validation (call after multer saves the file)
export function validateFileMagic(filePath: string, mimetype: string): boolean {
  try {
    const buf = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);

    const signatures = MAGIC[mimetype];
    if (!signatures) return false;

    return signatures.some(sig => sig.every((byte, i) => buf[i] === byte));
  } catch {
    return false;
  }
}
