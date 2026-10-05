import pg from 'pg';
const { Pool } = pg;

export interface DbClient {
  isPostgresConnected: boolean;
  query: (text: string, params?: any[]) => Promise<any>;
}

let pool: pg.Pool | null = null;
let postgresConnected = false;

// Check if PostgreSQL environment variables are configured
const isConfigured = Boolean(
  process.env.DATABASE_URL ||
  (process.env.POSTGRES_HOST && process.env.POSTGRES_USER)
);

if (isConfigured) {
  try {
    pool = new Pool(
      process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.POSTGRES_HOST || 'localhost',
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB || 'arc_verify',
            port: Number(process.env.POSTGRES_PORT || 5432),
          }
    );

    pool.on('error', (err) => {
      console.warn('PostgreSQL idle client notice:', err.message);
    });

    // Test connection lazily
    pool.connect().then((client) => {
      postgresConnected = true;
      console.log('Successfully connected to PostgreSQL off-chain database.');
      client.release();
    }).catch((err) => {
      console.warn('PostgreSQL offline or unreachable; using in-memory transactional storage:', err.message);
      postgresConnected = false;
    });
  } catch (err: any) {
    console.warn('Failed to initialize PostgreSQL pool:', err.message);
  }
}

export const getDb = (): DbClient => {
  return {
    isPostgresConnected: postgresConnected && pool !== null,
    query: async (text: string, params?: any[]) => {
      if (pool && postgresConnected) {
        return pool.query(text, params);
      }
      throw new Error('PostgreSQL connection not active');
    },
  };
};
