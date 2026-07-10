const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config();

async function runSchema() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const batches = fs
    .readFileSync(schemaPath, 'utf8')
    .split(/^\s*GO\s*;?\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);

  const pool = await new sql.ConnectionPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },
    pool: { min: 1, max: 1 },
  }).connect();

  try {
    for (const batch of batches) {
      await pool.request().batch(batch);
    }
    console.log('Esquema aplicado correctamente en BD_RRHH_IA.');
  } finally {
    await pool.close();
  }
}

runSchema().catch((error) => {
  console.error('No se pudo aplicar db/schema.sql:', error.message);
  process.exit(1);
});
