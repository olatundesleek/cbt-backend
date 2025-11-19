import {
  getSettingsService,
  updateSettingsService,
} from "../services/systemSettings.service.js";
import { success } from "../utils/response.js";

export const getSystemSettings = async (req, res, next) => {
  try {
    console.log("Fetched system settings:");
    const settings = await getSettingsService();

    if (!settings) {
      const error = new Error("unable to fetch system settings.");
      error.details = "System settings not found.";
      error.status = 404;
      throw error;
    }
    success(res, "system settings fetched successfully", settings);
  } catch (err) {
    next(err);
  }
};

export const updateSystemSettings = async (req, res, next) => {
  try {
    const {
      appName,
      institutionName,
      shortName,
      primaryColor,
      supportEmail,
      systemStatus,
    } = req.body;

    const data = {
      ...(appName !== undefined && { appName }),
      ...(institutionName !== undefined && { institutionName }),
      ...(shortName !== undefined && { shortName }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(supportEmail !== undefined && { supportEmail }),
      ...(systemStatus !== undefined && { systemStatus }),
    };

    // Pass data and files to service
    const updatedSettings = await updateSettingsService(data, req.files);

    success(res, "System settings updated successfully", updatedSettings);
  } catch (err) {
    next(err);
  }
};
