# 🚀 Quick Setup Instructions for BestDOC Task Manager

## ✅ What's Done

1. ✅ Created `.env.production.local` with your Supabase project URL
2. ✅ Updated documentation to reflect BestDOC Task Manager project
3. ✅ Committed all changes to GitHub

## ⚠️ Action Required: Get Your Anon Key

You provided the **secret key**, but the frontend needs the **anon/public key**.

### How to Get It:

1. Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/settings/api
2. Look for the **"anon"** or **"public"** key (it starts with `eyJ...`)
3. Copy it

### Update `.env.production.local`:

Open `.env.production.local` and replace `YOUR_ANON_KEY_HERE` with your actual anon key:

```bash
VITE_SUPABASE_URL=https://vzwcxhydyqdudngxyres.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_actual_anon_key_here
VITE_IS_DEMO=false
```

## 📋 Next Steps

### 1. Login to Supabase CLI
```bash
npx supabase login
```

### 2. Link Your Project
```bash
npx supabase link --project-ref vzwcxhydyqdudngxyres
```
(You'll need your database password - find it in Supabase Dashboard → Settings → Database)

### 3. Deploy Database
```bash
npx supabase db push
```

### 4. Deploy Functions
```bash
npx supabase functions deploy
```

### 5. Deploy to Vercel

1. Go to: https://vercel.com/new
2. Click "Continue with GitHub"
3. Select repository: `omeirkhatri/Task`
4. Add Environment Variables:
   - `VITE_SUPABASE_URL` = `https://vzwcxhydyqdudngxyres.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (your anon key)
   - `VITE_IS_DEMO` = `false`
5. Click "Deploy"

### 6. Configure Supabase Auth

After you get your Vercel URL:

1. Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/auth/url-configuration
2. Add to **Redirect URLs**: `https://your-vercel-url.vercel.app/auth-callback.html`
3. Set **Site URL**: `https://your-vercel-url.vercel.app`
4. Click "Save"

## 🔑 Key Information

- **Project:** BestDOC Task Manager
- **Project ID:** `vzwcxhydyqdudngxyres`
- **Project URL:** `https://vzwcxhydyqdudngxyres.supabase.co`
- **Secret Key:** `sb_secret_AEBSTr2TNtDJ2h4bZSRMqA_kGhQzY4n` (for server-side use)
- **Anon Key:** (You need to get this from the API settings page)

## 📚 Documentation

- See `DEPLOYMENT_STATUS.md` for detailed status
- See `docs/ENVIRONMENT_SETUP.md` for environment configuration
- See `DEPLOY_NOW.md` for quick deployment guide

