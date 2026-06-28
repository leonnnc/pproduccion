import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables del archivo .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

async function main() {
  const connectionConfig = {
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '6543', 10),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false }
  };

  if (!connectionConfig.host || !connectionConfig.password) {
    console.error('Error: Faltan las credenciales de la base de datos en el archivo .env');
    process.exit(1);
  }

  const client = new Client(connectionConfig);

  try {
    console.log('⚡ Conectando a PostgreSQL en Supabase...');
    await client.connect();
    console.log('✅ Conexión establecida con éxito.');

    // Leer el script SQL completo de setup
    const sqlPath = path.resolve(__dirname, '../supabase_setup.sql');
    console.log(`📖 Leyendo script: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🛠️ Ejecutando script SQL de reconstrucción de tablas y enums...');
    await client.query(sql);
    console.log('🎉 ¡Base de datos reconstruida y actualizada con éxito!');
  } catch (err) {
    console.error('❌ Error al ejecutar el script en la base de datos:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
