import prisma from "../config/prisma.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { getCachedOrFetch } from "../utils/cache.js";
import fs from "fs";
import path from "path";

export const updateSettingsService = async (data, file) => {
  try {
    const BASE_URL =
      process.env.NODE_ENV === "development"
        ? `http://localhost:${process.env.PORT || 4000}`
        : "";

    let logoUrl = undefined;
    let faviconUrl = undefined;
    let loginBannerUrl = undefined;

    // Handle Logo
    // Case 1: data.logo is null (explicit clear) -> set to null
    if (data.logo === null) {
      logoUrl = null;
    }
    // Case 2: file?.logo exists (new image) -> upload and use URL
    else if (file?.logo) {
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
    // Case 1: data.favicon is null (explicit clear) -> set to null
    if (data.favicon === null) {
      faviconUrl = null;
    }
    // Case 2: file?.favicon exists (new image) -> upload and use URL
    else if (file?.favicon) {
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
    // Case 3: neither -> leave undefined (don't update)

    // Handle Login Banner
    // Case 1: data.loginBanner is null (explicit clear) -> set to null
    if (data.loginBanner === null) {
      loginBannerUrl = null;
    }
    // Case 2: file?.loginBanner exists (new image) -> upload and use URL
    else if (file?.loginBanner) {
      const ext = path.extname(file.loginBanner[0].originalname); // get extension
      const filename = `loginBanner${ext}`;
      if (process.env.NODE_ENV === "development") {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        const uploadPath = path.join(uploadDir, filename);
        fs.renameSync(file.loginBanner[0].path, uploadPath); // overwrite
        loginBannerUrl = `${BASE_URL}/uploads/${filename}`;
      } else {
        const uploaded = await uploadToCloudinary(
          file.loginBanner[0].path,
          "cbt",
          "loginBanner"
        );
        loginBannerUrl = uploaded.secure_url;
      }
    }
    // Case 3: neither -> leave undefined (don't update)

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
      ...(logoUrl !== undefined && { logoUrl }),
      ...(faviconUrl !== undefined && { faviconUrl }),
      ...(loginBannerUrl !== undefined && { loginBannerUrl }),
    };

    const updated = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        id: 1,
        appName: appName || "",
        institutionName: institutionName || "",
        shortName: shortName || null,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        loginBannerUrl: loginBannerUrl || null,
        primaryColor: primaryColor || null,
        supportEmail: supportEmail || null,
        systemStatus: systemStatus || "ACTIVE",
      },
    });

    // Invalidate cache after update
    invalidateSystemSettingsCache();

    return updated;
  } catch (error) {
    throw error;
  }
};

export const getSettingsService = () => {
  // Cache system settings for 1 hour (3600000 ms) since they rarely change
  return getCachedOrFetch(
    "system_settings",
    () => prisma.systemSettings.findUnique({ where: { id: 1 } }),
    60 * 60 * 1000 // 1 hour TTL
  );
};

/**
 * Invalidate system settings cache
 * Called when settings are updated
 */
export const invalidateSystemSettingsCache = async () => {
  try {
    const cacheManager = (await import("../utils/cache.js")).default;
    cacheManager.invalidate("system_settings");
  } catch (err) {}
};
