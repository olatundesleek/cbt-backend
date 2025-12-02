import * as profileService from "../services/profile.service.js";
import { success } from "../utils/response.js";

export async function getProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    return success(res, "Profile fetched successfully", profile);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { firstname, lastname, username, email, phoneNumber } = req.body;
    const updated = await profileService.updateProfile(req.user.id, {
      firstname,
      lastname,
      username,
      email,
      phoneNumber,
    });
    return success(res, "Profile updated successfully", updated);
  } catch (err) {
    next(err);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await profileService.updatePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    return success(res, "Password updated successfully");
  } catch (err) {
    next(err);
  }
}
