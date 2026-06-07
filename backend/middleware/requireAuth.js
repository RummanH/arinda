import { readCookie } from '../lib/cookies.js';

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : '';
}

export function requireAuth(authService, env) {
  return async (req, res, next) => {
    try {
      const token = readCookie(req, env.SESSION_COOKIE_NAME) || readBearerToken(req);
      const user = await authService.getUserFromSessionToken(token);

      if (!user) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
      }

      req.currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
