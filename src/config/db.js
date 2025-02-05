const { Pool } = require("pg");
require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  
  ssl: {
    rejectUnauthorized: false
  },
  
  max: 10,
  min: 2,
  idleTimeoutMillis: 1000 * 60 * 10,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
  
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

const queryWithRetry = async (text, params, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      lastError = error;
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        console.warn(`Retry attempt ${i + 1} for query due to ${error.code}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      
      throw error; 
    }
  }
  
  throw lastError;
};

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

const healthCheck = async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.debug('Database health check: OK');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database health check failed:', err);
  }
};

setInterval(healthCheck, 1000 * 60 * 5);

(async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to the database successfully.");
    
    await client.query("SET TIME ZONE 'Europe/Bucharest'");
    console.log("Timezone set to Europe/Bucharest.");
    
    client.release();
  } catch (err) {
    console.error("Initial connection failed:", err);
  }
})();

process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('Pool has ended');
    process.exit(0);
  } catch (err) {
    console.error('Error during pool shutdown:', err);
    process.exit(1);
  }
});

module.exports = {
  query: queryWithRetry,
  getPool: () => pool
};