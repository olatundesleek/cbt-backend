import { fetchDashboardData } from "../services/dashboard.service.js";
import { success } from "../utils/response.js";
export const getDashboardData = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role;

    const dashboardData = await fetchDashboardData(role, user.id);

    success(res, "Dashboard data fetched successfully", dashboardData);
  } catch (error) {
    next(error);
  }
};
