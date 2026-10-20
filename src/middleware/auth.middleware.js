import prisma from '../config/prisma.js';
import { verifyToken } from '../utils/jwt.js';
import {
  getLogin,
  normalizeUsername,
  updateActivity,
  isLoginValid,
  removeLogin,
} from '../utils/loginManager.js';

export async function authenticate(req, res, next) {
  let token = req.cookies?.reqtoken;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token)
    return res.status(401).json({ success: false, message: 'No token' });

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (!payload?.username || !payload?.loginId) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  try {
    const username = normalizeUsername(payload.username);
    const activeLogin = getLogin(username, payload.loginId);
    if (!activeLogin || !isLoginValid(username, payload.loginId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: 'User not found' });
    if (!user.isActive) {
      removeLogin(username, payload.loginId);
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been disabled.',
      });
    }

    req.user = user;
    req.login = activeLogin;
    req.loginId = payload.loginId;
    updateActivity(username, payload.loginId);

    next();
  } catch (error) {
    next(error);
  }
}

export const checkDemoUser = (req, res, next) => {
  if (req.user && req.user.isDemoUser) {
    return res.status(403).json({ error: 'Action not allowed for demo users' });
  }
  next();
};
