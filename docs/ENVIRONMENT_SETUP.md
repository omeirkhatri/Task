# Environment Setup Guide

This document explains how to set up separate environments for local development (using Supabase CLI) and production (using supabase.com).

## Overview

The application supports two Supabase configurations:

1. **Local Development** - Uses Supabase CLI (`npx supabase start`)
   - Database runs locally on your machine
   - Access via `http://127.0.0.1:54321`
   - No `.env.production.local` needed
   - Use `.env.local` or `.env.development.local` for local overrides

2. **Production/Cloud** - Uses Supabase Cloud (supabase.com)
   - Database hosted on Supabase cloud
   - Access via `https://YOUR_PROJECT_REF.supabase.co`
   - Requires `.env.production.local` file
   - Used by Vercel deployments

## Environment Variables

The application uses these environment variables:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `VITE_IS_DEMO` - Set to `"false"` for production, `"true"` for demo mode
- `VITE_INBOUND_EMAIL` - (Optional) Postmark inbound email address
- `VITE_GOOGLE_MAPS_API_KEY` - (Optional) Google Maps API key

## Local Development Setup

### Using Supabase CLI (Recommended for Development)

1. **Start local Supabase:**
   ```bash
   make start-supabase
   # or
   npx supabase start
   ```

2. **Get local credentials:**
   ```bash
   npx supabase status
   ```
   
   This will show:
   - API URL: `http://127.0.0.1:54321`
   - anon key: (shown in output)

3. **Create `.env.local` (optional):**
   ```bash
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=your_local_anon_key
   VITE_IS_DEMO=false
   ```

4. **Start the app:**
   ```bash
   npm run dev
   ```

The app will automatically use local Supabase if `VITE_SUPABASE_URL` is not set or points to localhost.

## Production Setup (Supabase Cloud)

### Step 1: Get Supabase Cloud Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://lwpxzgkjuevjlilgvdac.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### Step 2: Create Production Environment File

Create `.env.production.local` in the project root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_IS_DEMO=false
```

**Important:** This file is gitignored and should never be committed.

### Step 3: Link and Deploy to Supabase Cloud

1. **Login to Supabase CLI:**
   ```bash
   npx supabase login
   ```

2. **Link your project:**
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   (You'll need your database password - find it in Supabase Dashboard → Settings → Database)

3. **Deploy database migrations:**
   ```bash
   npx supabase db push
   ```

4. **Deploy edge functions:**
   ```bash
   npx supabase functions deploy
   ```

### Step 4: Configure Authentication URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your production URL to **Redirect URLs**:
   - `https://your-app.vercel.app/auth-callback.html`
3. Set **Site URL** to:
   - `https://your-app.vercel.app`

## Vercel Deployment

### Automatic Deployment (Recommended)

1. **Import project in Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Click "Continue with GitHub"
   - Select your repository: `omeirkhatri/Task`
   - Click "Import"

2. **Configure environment variables:**
   - In Vercel project settings → **Environment Variables**
   - Add:
     - `VITE_SUPABASE_URL` = Your Supabase cloud URL
     - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
     - `VITE_IS_DEMO` = `false`
   - Apply to: **Production**, **Preview**, and **Development**

3. **Deploy:**
   - Vercel will automatically detect Vite configuration
   - Click "Deploy"
   - Wait for build to complete

4. **Get deployment URL:**
   - After deployment, copy your Vercel URL
   - Update Supabase auth redirect URLs (see Step 4 above)

### Manual Deployment

If you prefer to deploy manually:

```bash
# Build the app
npm run build

# Deploy using Vercel CLI
npx vercel --prod
```

## Switching Between Environments

### For Local Development:
- Use `make start-supabase` to start local Supabase
- Don't use `.env.production.local`
- App connects to `http://127.0.0.1:54321`

### For Production Testing:
- Create `.env.production.local` with cloud credentials
- Run `npm run dev` (will use cloud Supabase)
- Or build and test: `npm run build && npm run preview`

### For Production Deployment:
- Ensure `.env.production.local` exists with cloud credentials
- Push to GitHub (Vercel auto-deploys)
- Or manually deploy: `npx vercel --prod`

## Troubleshooting

### Local Supabase not starting:
```bash
# Reset local Supabase
make supabase-reset-database

# Or stop and restart
make stop-supabase
make start-supabase
```

### Can't link to Supabase cloud:
- Verify you're logged in: `npx supabase login`
- Check project ref is correct
- Ensure database password is correct (reset in Supabase Dashboard if needed)

### Vercel build fails:
- Check environment variables are set correctly
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Check build logs in Vercel dashboard

### Authentication not working:
- Verify redirect URLs in Supabase Dashboard
- Check Site URL matches your deployment URL
- Ensure `auth-callback.html` is accessible

## Quick Reference

| Environment | Supabase Source | Config File | Command |
|------------|----------------|-------------|---------|
| Local Dev | Supabase CLI | `.env.local` (optional) | `make start` |
| Production Test | Supabase Cloud | `.env.production.local` | `npm run dev` |
| Production Deploy | Supabase Cloud | Vercel env vars | Auto-deploy on push |

## Notes

- `.env.production.local` is for local testing with cloud Supabase
- Vercel uses environment variables set in dashboard (not `.env.production.local`)
- Local Supabase CLI and cloud Supabase can coexist
- Always use cloud Supabase for production deployments

