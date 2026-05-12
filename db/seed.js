const fs = require('fs');
const path = require('path');
const pool = require('./connection');

async function seed() {
  const seedsDir = path.join(__dirname, 'seeds');
  const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
    console.log(`Running seed: ${file}`);
    await pool.query(sql);
    console.log(`  Done.`);
  }

  await pool.end();
  console.log('All seeds complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
