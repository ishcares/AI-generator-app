const { pool } = require('./pool');
const fs = require('fs');
const path = require('path');

const migrationsPath = path.join(__dirname, 'migrations.sql');
const sql = fs.readFileSync(migrationsPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migrations ran successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
