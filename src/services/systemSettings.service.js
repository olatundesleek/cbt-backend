import prisma from "../config/prisma.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";

export const updateSettingsService = async (data, file) => {
  try {
    const BASE_URL =
      process.env.NODE_ENV === "development"
        ? `http://localhost:${process.env.PORT || 4000}`
        : "";

    let logoUrl = null;
    let faviconUrl = null;

    // Handle Logo
    if (file?.logo) {
      const ext = path.extname(file.logo[0].originalname); // get extension
      const filename = `logo${ext}`;

      if (process.env.NODE_ENV === "development") {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

        const uploadPath = path.join(uploadDir, filename);
        fs.renameSync(file.logo[0].path, uploadPath); // overwrite
        logoUrl = `${BASE_URL}/uploads/${filename}`;
      } else {
        const uploaded = await uploadToCloudinary(
          file.logo[0].path,
          "cbt",
          "logo"
        );
        logoUrl = uploaded.secure_url;
      }
    }

    // Handle Favicon
    if (file?.favicon) {
      const ext = path.extname(file.favicon[0].originalname);
      const filename = `favicon${ext}`;

      if (process.env.NODE_ENV === "development") {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

        const uploadPath = path.join(uploadDir, filename);
        fs.renameSync(file.favicon[0].path, uploadPath); // overwrite
        faviconUrl = `${BASE_URL}/uploads/${filename}`;
      } else {
        const uploaded = await uploadToCloudinary(
          file.favicon[0].path,
          "cbt",
          "favicon"
        );
        faviconUrl = uploaded.secure_url;
      }
    }

    // Only keep defined fields
    const {
      appName,
      institutionName,
      shortName,
      primaryColor,
      supportEmail,
      systemStatus,
    } = data;

    const updateData = {
      ...(appName !== undefined && { appName }),
      ...(institutionName !== undefined && { institutionName }),
      ...(shortName !== undefined && { shortName }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(supportEmail !== undefined && { supportEmail }),
      ...(systemStatus !== undefined && { systemStatus }),
      ...(logoUrl && { logoUrl }),
      ...(faviconUrl && { faviconUrl }),
    };

    return prisma.systemSettings.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        appName: appName || "",
        institutionName: institutionName || "",
        shortName: shortName || null,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        primaryColor: primaryColor || null,
        supportEmail: supportEmail || null,
        systemStatus: systemStatus || "ACTIVE",
      },
    });
  } catch (error) {
    throw error;
  }
};

export const getSettingsService = () => {
  return prisma.systemSettings.findUnique({ where: { id: 1 } });
};
