import dotenv from 'dotenv';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';

dotenv.config({ path: '../.env' });

const MySQLStore = MySQLStoreFactory(session);
const useMySQLSessionStore = Boolean(process.env.DB_HOST) && process.env.NODE_ENV !== 'test';

const sessionStore = useMySQLSessionStore
  ? new MySQLStore({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'smart_hospital',
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data',
        },
      },
    })
  : new session.MemoryStore();

export const sessionMiddleware = session({
  name: process.env.SESSION_NAME || 'shms.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === 'true',
    maxAge: 1000 * 60 * 60 * 8,
  },
});

export default sessionMiddleware;
