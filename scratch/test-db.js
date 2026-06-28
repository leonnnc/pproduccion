import pg from 'pg';

const { Client } = pg;
const password = 'k4J4J$F3-j!hS-E';
const projectRef = 'uufxxzrasmvwejbvqbvi';
const user = `postgres.${projectRef}`;

async function testHost(index) {
  const host = `aws-${index}-us-east-1.pooler.supabase.com`;
  console.log(`Testing host: ${host}`);
  const client = new Client({
    host: host,
    port: 6543,
    user: user,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ ¡CONEXIÓN EXITOSA CON EL HOST: ${host}!`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ ${host} -> Error: ${err.message}`);
    return false;
  }
}

async function run() {
  for (let i = 0; i <= 15; i++) {
    const success = await testHost(i);
    if (success) {
      console.log(`\n🎉 El host correcto es: aws-${i}-us-east-1.pooler.supabase.com`);
      return;
    }
  }
  console.log('\n❌ No se pudo conectar a ningún host en us-east-1.');
}

run();
