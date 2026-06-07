const DATABASE_URL = process.env.DATABASE_URL;
const PORT = Number(process.env.PORT || 3001);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Add it to your .env file.');
}

if (!Number.isFinite(SESSION_DAYS) || SESSION_DAYS <= 0) {
  throw new Error('SESSION_DAYS must be a positive number.');
}

export const env = {
  DATABASE_URL,
  DEFAULT_SUPER_ADMIN_EMAIL: process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@arinda.local',
  DEFAULT_SUPER_ADMIN_NAME: process.env.DEFAULT_SUPER_ADMIN_NAME || 'Super Admin',
  DEFAULT_SUPER_ADMIN_PASSWORD: process.env.DEFAULT_SUPER_ADMIN_PASSWORD || 'Admin@12345',
  NODE_ENV,
  PORT,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'arinda_session',
  SESSION_DAYS,
};
