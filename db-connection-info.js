#!/usr/bin/env node
/**
 * Display database connection information for DBeaver, psql, etc.
 */

require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL not found in backend/.env');
  process.exit(1);
}

// Extract project reference from URL
const projectRef = supabaseUrl
  .replace('https://', '')
  .replace('.supabase.co', '');

const host = `db.${projectRef}.supabase.co`;
const port = '5432';
const database = 'postgres';
const username = 'postgres';

console.log('\n🔌 SmartMENA Database Connection Info\n');
console.log('═'.repeat(60));
console.log('\n📋 For DBeaver / pgAdmin / TablePlus:\n');
console.log(`  Host:     ${host}`);
console.log(`  Port:     ${port}`);
console.log(`  Database: ${database}`);
console.log(`  Username: ${username}`);
console.log(`  Password: [Get from Supabase Dashboard → Settings → Database]`);
console.log(`  SSL Mode: require\n`);

console.log('═'.repeat(60));
console.log('\n🔗 Connection String (for psql, Node.js, etc.):\n');
console.log(`  postgresql://postgres:[PASSWORD]@${host}:${port}/${database}\n`);

console.log('═'.repeat(60));
console.log('\n📖 How to get your database password:\n');
console.log('  1. Go to: https://supabase.com/dashboard');
console.log(`  2. Select project: ${projectRef}`);
console.log('  3. Click Settings → Database');
console.log('  4. Scroll to "Connection string" section');
console.log('  5. Copy your password (or reset if needed)\n');

console.log('═'.repeat(60));
console.log('\n🔐 Security Note:\n');
console.log('  Never commit your database password to Git!');
console.log('  It should only be in backend/.env (which is .gitignored)\n');
console.log('═'.repeat(60) + '\n');
