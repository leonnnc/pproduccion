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
    
    // 1. Degradad a leonnnc@gmail.com a 'servant'
    const query1 = `
      UPDATE public.usuarios 
      SET rol = 'servant'::public.tipo_rol 
      WHERE email = 'leonnnc@gmail.com';
    `;
    const res1 = await client.query(query1);
    
    // 2. Asegurar que admin@produccion.com es 'superadmin'
    const query2 = `
      UPDATE public.usuarios 
      SET rol = 'superadmin'::public.tipo_rol 
      WHERE email = 'admin@produccion.com';
    `;
    const res2 = await client.query(query2);

    console.log('RESULT_START');
    console.log(`Degradado leonnnc@gmail.com: ${res1.rowCount} fila(s) afectada(s).`);
    console.log(`Confirmado admin@produccion.com como superadmin: ${res2.rowCount} fila(s) afectada(s).`);
    console.log('RESULT_END');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
