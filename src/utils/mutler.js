import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadPath))
      fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // get original extension
    let name = "";

    if (file.fieldname === "logo") name = `logo${ext}`;
    if (file.fieldname === "favicon") name = `favicon${ext}`;
    if (file.fieldname === "loginBanner") name = `loginBanner${ext}`;

    cb(null, name); // always overwrite
  },
});

export const upload = multer({ storage });
