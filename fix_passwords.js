const bcrypt = require('bcrypt');
const pkg = require('pg');
const { Pool } = pkg;

const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'gps_db',
  user: 'postgres',
  password: 'postgres'
});

async function resetPasswords() {
  const users = [
    { username: 'admin', password: 'admin123' },
    { username: 'juan_revisor', password: 'password123' },
    { username: 'pedro_terreno', password: 'password123' },
    { username: 'maria_lectora', password: 'password123' },
    { username: 'test_revisor_2', password: 'password123' },
    { username: 'revisor_test', password: 'password123' },
    { username: 'test_lector_2', password: 'password123' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const result = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE username = $2 RETURNING username, rol, estado',
      [hash, u.username]
    );
    if (result.rows.length > 0) {
      console.log(`OK: ${u.username} (${result.rows[0].rol}) - password='${u.password}'`);
    } else {
      console.log(`NOT FOUND: ${u.username}`);
    }
  }

  await pool.end();
  console.log('Done.');
}

resetPasswords().catch(e => { console.error(e); process.exit(1); });
