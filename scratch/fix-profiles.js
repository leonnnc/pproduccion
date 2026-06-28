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
    
    // Crear perfiles para todos los usuarios de auth.users si no existen
    const query = `
      INSERT INTO public.usuarios (id, email, nombre_completo, rol, telefono, distrito)
      SELECT 
        id, 
        email, 
        COALESCE(raw_user_meta_data->>'nombre_completo', 'Administrador'), 
        'superadmin'::public.tipo_rol, 
        COALESCE(raw_user_meta_data->>'telefono', ''), 
        COALESCE(raw_user_meta_data->>'distrito', 'Lima')
      FROM auth.users
      ON CONFLICT (id) DO NOTHING;
    `;
    
    await client.query(query);
    console.log('Perfiles públicos creados exitosamente para los usuarios existentes.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
