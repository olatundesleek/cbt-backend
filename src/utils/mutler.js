import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

/**
 * Single Multer instance for all uploads
 * Handles:
 * 1. Singleton files (logo, favicon, loginBanner) → always overwrite
 * 2. Question bank images (images) → multiple, unique filenames
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Default uploads folder
    let uploadPath = path.join(process.cwd(), "uploads");

    // Question bank images go in a subfolder
    if (file.fieldname === "bankImages") {
      uploadPath = path.join(uploadPath, "question-banks");
    }

    // Create folder if it doesn't exist
    if (!fs.existsSync(uploadPath))
      fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    // -----------------------------
    // Singleton system files
    // -----------------------------
    if (file.fieldname === "logo") return cb(null, `logo${ext}`);
    if (file.fieldname === "favicon") return cb(null, `favicon${ext}`);
    if (file.fieldname === "loginBanner") return cb(null, `loginBanner${ext}`);

    // -----------------------------
    // Question bank images
    // -----------------------------
    if (file.fieldname === "bankImages") {
      // Unique filename to avoid overwriting
      return cb(null, `${uuidv4()}${ext}`);
    }

    // -----------------------------
    // Fallback for any other field
    // -----------------------------
    cb(null, `${uuidv4()}${ext}`);
  },
});

// -----------------------------
// Multer instance
// -----------------------------
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});
