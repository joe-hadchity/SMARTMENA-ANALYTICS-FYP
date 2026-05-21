#!/usr/bin/env node
/**
 * SmartMENA Database Viewer
 * Quick script to view database tables without leaving the terminal
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLES = [
  'workspaces',
  'social_accounts',
  'synced_posts',
  'post_metrics',
  'ai_insights',
  'campaigns',
  'scheduled_posts',
  'competitor_profiles',
  'trend_insights',
  'hashtag_trends',
  'audience_insights',
  'auth_users'
];

async function showTableCounts() {
  console.log('\n📊 SmartMENA Database Overview\n');
  console.log('Table'.padEnd(25) + 'Count'.padStart(10));
  console.log('─'.repeat(35));

  for (const table of TABLES) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(table.padEnd(25) + 'N/A'.padStart(10) + ' (table may not exist)');
      } else {
        console.log(table.padEnd(25) + (count || 0).toString().padStart(10));
      }
    } catch (err) {
      console.log(table.padEnd(25) + 'ERROR'.padStart(10));
    }
  }
  console.log('─'.repeat(35));
}

async function showRecentData(table, limit = 5) {
  console.log(`\n📋 Recent ${table} (limit ${limit}):\n`);

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Error fetching ${table}:`, error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('  (empty table)');
    return;
  }

  console.table(data);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  node view-db.js                    Show all table counts
  node view-db.js <table>            Show recent rows from a table
  node view-db.js <table> <limit>    Show N recent rows

Examples:
  node view-db.js
  node view-db.js workspaces
  node view-db.js synced_posts 10

Available tables:
  ${TABLES.join('\n  ')}
    `);
    return;
  }

  if (args[0]) {
    const table = args[0];
    const limit = parseInt(args[1]) || 5;
    await showRecentData(table, limit);
  } else {
    await showTableCounts();
  }
}

main().catch(console.error);
