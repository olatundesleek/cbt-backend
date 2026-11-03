import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, `questions-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// File filter to only allow CSV files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV files are allowed"), false);
  }
};

const excelFileFilter = (req, file, cb) => {
  if (path.extname(file.originalname).toLowerCase() === ".xlsx") {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error("Only .xlsx Excel files are allowed"), {
        status: 400,
      }),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5, // Limit file size to 5MB
  },
});

export const excelUpload = multer({
  storage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});

/**
 * Generic single file upload with configurable destination and limits
 * @param {string} fieldName - The form field name
 * @param {Object} options - Configuration options
 * @returns {Function} Multer middleware function
 */
export const uploadSingle = (fieldName, options = {}) => {
  const {
    destination = "uploads/",
    maxSize = 1024 * 1024 * 100, // Default 100MB for backups
    allowedTypes = [], // Empty array means allow all types
  } = options;

  // Ensure destination directory exists
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const customStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, destination);
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${timestamp}${ext}`);
    },
  });

  const customFileFilter =
    allowedTypes.length > 0
      ? (req, file, cb) => {
          if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new Error(
                `Only ${allowedTypes.join(", ")} files are allowed`
              ),
              false
            );
          }
        }
      : (req, file, cb) => cb(null, true);

  const multerInstance = multer({
    storage: customStorage,
    fileFilter: customFileFilter,
    limits: {
      fileSize: maxSize,
    },
  });

  return multerInstance.single(fieldName);
};

export default upload;
