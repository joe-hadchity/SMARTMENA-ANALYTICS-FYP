#!/usr/bin/env node
/**
 * Query users with their workspaces and memberships
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function queryUsers() {
  console.log('\n👥 Users Overview\n');

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('Error fetching users:', usersError.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No users found.');
    return;
  }

  console.log(`Found ${users.length} user(s):\n`);

  // For each user, get their workspaces
  for (const user of users) {
    console.log('─'.repeat(60));
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Name: ${user.name}`);
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📅 Created: ${new Date(user.created_at).toLocaleString()}`);

    // Get memberships
    const { data: memberships } = await supabase
      .from('workspace_memberships')
      .select(`
        role,
        status,
        workspace:workspaces(id, name, slug, region_default, locale_default)
      `)
      .eq('user_id', user.id);

    if (memberships && memberships.length > 0) {
      console.log('\n🏢 Workspaces:');
      memberships.forEach((m, idx) => {
        const ws = m.workspace;
        console.log(`  ${idx + 1}. ${ws.name} (${ws.slug})`);
        console.log(`     Role: ${m.role} | Status: ${m.status}`);
        console.log(`     Region: ${ws.region_default || 'N/A'} | Locale: ${ws.locale_default}`);
      });
    } else {
      console.log('\n🏢 No workspaces');
    }
    console.log('');
  }
  console.log('─'.repeat(60));
}

async function queryWorkspaces() {
  console.log('\n🏢 Workspaces Overview\n');

  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!workspaces || workspaces.length === 0) {
    console.log('No workspaces found.');
    return;
  }

  console.log(`Found ${workspaces.length} workspace(s):\n`);

  for (const ws of workspaces) {
    console.log('─'.repeat(60));
    console.log(`📛 Name: ${ws.name}`);
    console.log(`🔗 Slug: ${ws.slug}`);
    console.log(`🆔 ID: ${ws.id}`);
    console.log(`🌍 Region: ${ws.region_default || 'N/A'}`);
    console.log(`🗣️  Locale: ${ws.locale_default}`);
    console.log(`📅 Created: ${new Date(ws.created_at).toLocaleString()}`);

    // Get member count
    const { count } = await supabase
      .from('workspace_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', ws.id);

    console.log(`👥 Members: ${count || 0}`);

    // Get social accounts count
    const { count: accountsCount } = await supabase
      .from('social_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', ws.id);

    console.log(`📱 Social Accounts: ${accountsCount || 0}`);
    console.log('');
  }
  console.log('─'.repeat(60));
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'workspaces' || args[0] === 'ws') {
    await queryWorkspaces();
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  node query-users.js           Show all users with workspaces
  node query-users.js ws        Show all workspaces with member counts
  node query-users.js --help    Show this help

Examples:
  node query-users.js
  node query-users.js workspaces
    `);
  } else {
    await queryUsers();
  }
}

main().catch(console.error);
