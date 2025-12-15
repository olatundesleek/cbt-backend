import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

export const uploadToCloudinary = async (
  filePath,
  folder,
  public_id = null
) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const options = { folder };
  if (public_id) {
    options.public_id = public_id;
    options.overwrite = true;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, { options });
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return result;
  } catch (err) {
    throw err;
  }
};
