import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

async function run() {
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '6543', 10),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const query = `
      SELECT 
        au.email,
        u.nombre_completo,
        u.rol,
        au.last_sign_in_at
      FROM auth.users au
      LEFT JOIN public.usuarios u ON au.id = u.id
      ORDER BY au.last_sign_in_at DESC NULLS LAST;
    `;
    
    const res = await client.query(query);
    console.log('RESULT_START');
    console.log(JSON.stringify(res.rows));
    console.log('RESULT_END');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
