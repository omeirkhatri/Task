#!/bin/bash

# Automated Vercel Deployment Script
# This script will deploy your Atomic CRM to Vercel

set -e

echo "🚀 Starting Vercel Deployment..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check for .env.production.local
if [ ! -f ".env.production.local" ]; then
    echo "❌ Error: .env.production.local not found. Please set up Supabase first."
    exit 1
fi

# Read Supabase credentials
source .env.production.local

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env.production.local"
    exit 1
fi

echo "✅ Found Supabase credentials"
echo ""

# Install Vercel CLI if needed
echo "📦 Setting up Vercel CLI..."
npx vercel --version > /dev/null 2>&1 || echo "Vercel CLI will be installed on first use"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
echo ""
echo "You will be prompted to:"
echo "  1. Login to Vercel (if not already logged in)"
echo "  2. Link your project (or create a new one)"
echo "  3. Confirm deployment settings"
echo ""

# Deploy with environment variables
npx vercel --prod \
  --yes \
  --env VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --env VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --env VITE_IS_DEMO="false"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Go to your Vercel dashboard to get your deployment URL"
echo "  2. Update Supabase Authentication → URL Configuration with your Vercel URL"
echo "  3. Visit your deployed app and create your first admin account"
echo ""
