#!/bin/bash
# Connect to Supabase PostgreSQL database via psql

echo "🔌 Connecting to SmartMENA Database..."
echo ""
echo "You'll need your Supabase project password."
echo "Find it at: https://supabase.com/dashboard → Settings → Database"
echo ""

# Extract DB details from backend/.env
SUPABASE_URL=$(grep SUPABASE_URL backend/.env | cut -d '=' -f2)
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')

DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "Connecting to: $DB_HOST"
echo ""

# Connect using psql (must be installed)
psql "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
