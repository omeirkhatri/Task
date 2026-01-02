#!/bin/bash

# Setup Production Environment Script
# This script helps set up .env.production.local for Supabase cloud deployment

set -e

echo "🚀 Setting up production environment..."
echo ""

# Check if .env.production.local already exists
if [ -f ".env.production.local" ]; then
    echo "⚠️  .env.production.local already exists."
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted."
        exit 1
    fi
fi

# Get Supabase project details
echo "📋 Please provide your Supabase cloud credentials:"
echo "   (Find these in Supabase Dashboard → Settings → API)"
echo ""

read -p "Enter Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter Supabase Anon Key: " SUPABASE_ANON_KEY

# Validate inputs
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Both URL and Anon Key are required."
    exit 1
fi

# Create .env.production.local
cat > .env.production.local << EOF
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_IS_DEMO=false
EOF

echo ""
echo "✅ Created .env.production.local"
echo ""
echo "📝 Next steps:"
echo "   1. Link Supabase project: npx supabase link --project-ref YOUR_PROJECT_REF"
echo "   2. Deploy database: npx supabase db push"
echo "   3. Deploy functions: npx supabase functions deploy"
echo "   4. Set up Vercel with these environment variables"
echo ""

