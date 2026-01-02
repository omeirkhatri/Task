# 🚀 Complete Deployment Guide - BestDOC Task Manager

## ✅ What's Already Done

1. ✅ `.env.production.local` created with your credentials:
   - Project URL: `https://vzwcxhydyqdudngxyres.supabase.co`
   - Anon Key: `sb_publishable_r05iMsuhCXEVgWXV9QY4TQ_4W2dC_nA`
   - Secret Key: `sb_secret_AEBSTr2TNtDJ2h4bZSRMqA_kGhQzY4n` (for server-side)

2. ✅ All code committed and pushed to GitHub

## 📋 Step-by-Step Deployment

### Step 1: Deploy Database to Supabase Cloud

**Option A: Using Supabase Dashboard (Easiest)**

1. Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/sql/new
2. Copy and paste the contents of each migration file from `supabase/migrations/`
3. Run them in order (by timestamp)
4. Or use the SQL Editor to run all migrations

**Option B: Using Supabase CLI (Requires Login)**

1. Open a terminal and run:
   ```bash
   npx supabase login
   ```
   (This will open a browser for authentication)

2. Link the project:
   ```bash
   npx supabase link --project-ref vzwcxhydyqdudngxyres
   ```
   (You'll need your database password)

3. Deploy database:
   ```bash
   npx supabase db push
   ```

4. Deploy functions:
   ```bash
   npx supabase functions deploy
   ```

### Step 2: Deploy to Vercel

1. **Go to Vercel:**
   - Visit: https://vercel.com/new
   - Click "Continue with GitHub" (if not already connected)
   - Search for and select repository: `omeirkhatri/Task`
   - Click "Import"

2. **Configure Project Settings:**
   - Framework Preset: Vite (should auto-detect)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (should auto-detect)
   - Output Directory: `dist` (should auto-detect)
   - Install Command: `npm install` (should auto-detect)

3. **Add Environment Variables:**
   - Click "Environment Variables" section
   - Add these variables:
     ```
     VITE_SUPABASE_URL = https://vzwcxhydyqdudngxyres.supabase.co
     VITE_SUPABASE_ANON_KEY = sb_publishable_r05iMsuhCXEVgWXV9QY4TQ_4W2dC_nA
     VITE_IS_DEMO = false
     ```
   - Apply to: Production, Preview, and Development

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (usually 2-3 minutes)
   - Copy your deployment URL (e.g., `https://task-xxxxx.vercel.app`)

### Step 3: Configure Supabase Authentication

After you get your Vercel URL:

1. **Go to Supabase Auth Settings:**
   - Visit: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/auth/url-configuration

2. **Add Redirect URLs:**
   - In "Redirect URLs" section, add:
     ```
     https://your-vercel-url.vercel.app/auth-callback.html
     ```
   - Click "Add URL" or "Save"

3. **Set Site URL:**
   - In "Site URL" field, set:
     ```
     https://your-vercel-url.vercel.app
     ```
   - Click "Save"

### Step 4: Test Your Deployment

1. Visit your Vercel URL
2. You should see the login page
3. Create your first admin account
4. Verify everything works!

## 🔧 Manual Supabase Deployment (If CLI Doesn't Work)

If you can't use the CLI, you can deploy manually:

### Deploy Database Migrations:

1. Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/sql/new
2. For each file in `supabase/migrations/` (in order):
   - Open the file
   - Copy its contents
   - Paste into SQL Editor
   - Click "Run"

### Deploy Edge Functions:

1. Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/functions
2. For each function in `supabase/functions/`:
   - Create a new function in the dashboard
   - Copy the function code
   - Deploy it

## 📝 Environment Variables Summary

### For Vercel:
```
VITE_SUPABASE_URL=https://vzwcxhydyqdudngxyres.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_r05iMsuhCXEVgWXV9QY4TQ_4W2dC_nA
VITE_IS_DEMO=false
```

### For Local Development (Optional):
Create `.env.local`:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=(get from `npx supabase status`)
VITE_IS_DEMO=false
```

## 🎯 Quick Checklist

- [ ] Deploy database migrations to Supabase
- [ ] Deploy edge functions to Supabase
- [ ] Import project to Vercel
- [ ] Add environment variables to Vercel
- [ ] Deploy to Vercel
- [ ] Get Vercel deployment URL
- [ ] Update Supabase auth redirect URLs
- [ ] Test the deployed application

## 🔗 Useful Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres
- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repo:** https://github.com/omeirkhatri/Task

## 🆘 Troubleshooting

### Vercel Build Fails:
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure `package.json` has correct build scripts

### Supabase Connection Issues:
- Verify anon key is correct
- Check Supabase project is active
- Verify redirect URLs are configured

### Authentication Not Working:
- Check redirect URLs in Supabase dashboard
- Verify Site URL matches your Vercel URL
- Ensure `auth-callback.html` is accessible

## ✅ You're All Set!

Once you complete these steps, your BestDOC Task Manager will be live and accessible to users!

