# 🚀 Quick Deployment Guide

Follow these steps to deploy your app to production.

## Step 1: Get Supabase Credentials

1. Go to: https://supabase.com/dashboard/project/lwpxzgkjuevjlilgvdac/settings/api
2. Copy:
   - **Project URL**: `https://lwpxzgkjuevjlilgvdac.supabase.co`
   - **anon/public key**: (the long string shown on the page)

## Step 2: Create Production Environment File

Run this command and enter your credentials when prompted:

```bash
./scripts/setup-production-env.sh
```

Or manually create `.env.production.local`:

```bash
VITE_SUPABASE_URL=https://lwpxzgkjuevjlilgvdac.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_IS_DEMO=false
```

## Step 3: Link and Deploy to Supabase

1. **Get your database password:**
   - Go to: https://supabase.com/dashboard/project/lwpxzgkjuevjlilgvdac/settings/database
   - If you forgot it, click "Reset database password"

2. **Link the project:**
   ```bash
   npx supabase link --project-ref lwpxzgkjuevjlilgvdac
   ```
   (Enter your database password when prompted)

3. **Deploy database:**
   ```bash
   npx supabase db push
   ```

4. **Deploy functions:**
   ```bash
   npx supabase functions deploy
   ```

## Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/new
2. Click "Continue with GitHub"
3. Select repository: `omeirkhatri/Task`
4. Click "Import"

5. **Add Environment Variables:**
   - Go to project settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = `https://lwpxzgkjuevjlilgvdac.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = (your anon key from Step 1)
     - `VITE_IS_DEMO` = `false`
   - Apply to: Production, Preview, Development

6. Click "Deploy"
7. Wait for deployment to complete
8. Copy your Vercel URL (e.g., `https://task-xxxxx.vercel.app`)

### Option B: Via CLI

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Step 5: Configure Supabase Auth URLs

1. Go to: https://supabase.com/dashboard/project/lwpxzgkjuevjlilgvdac/auth/url-configuration
2. Add to **Redirect URLs**:
   - `https://your-vercel-url.vercel.app/auth-callback.html`
3. Set **Site URL** to:
   - `https://your-vercel-url.vercel.app`
4. Click "Save"

## Step 6: Test Your Deployment

1. Visit your Vercel URL
2. Create your first admin account
3. Verify everything works!

## ✅ You're Live!

Your app is now deployed and accessible at your Vercel URL.

## Environment Summary

- **Local Development**: Uses Supabase CLI (`make start-supabase`)
- **Production**: Uses Supabase Cloud (supabase.com)
- **Vercel**: Auto-deploys on every push to `main` branch

See `docs/ENVIRONMENT_SETUP.md` for detailed environment configuration.

