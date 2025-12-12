# ⚡ Quick Deploy Guide (15 Minutes)

## Prerequisites
- GitHub account
- Node.js installed locally

---

## Step 1: Set Up Supabase Cloud (Backend) - 5 minutes

### Option A: Automated Setup (Easiest)

1. **Sign up for Supabase** (free):
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project" → Sign up with GitHub
   - **No credit card required!**

2. **Run the setup script**:
   ```bash
   make supabase-remote-init
   ```
   
   The script will:
   - Log you into Supabase
   - Create a new project
   - Set up the database
   - Deploy functions
   - Create `.env.production.local` file

3. **Save your credentials**:
   - The script creates `.env.production.local` with your Supabase URL and key
   - Keep this file safe!

### Option B: Manual Setup

1. **Create project**:
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Enter name: "atomic-crm"
   - Set database password (save it!)
   - Click "Create new project"

2. **Get credentials**:
   - Go to **Settings** → **API**
   - Copy **Project URL** and **anon/public key**

3. **Deploy database**:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   npx supabase functions deploy
   ```

4. **Create `.env.production.local`**:
   ```bash
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

---

## Step 2: Configure Supabase Authentication - 2 minutes

1. Go to Supabase dashboard → **Authentication** → **URL Configuration**

2. Add redirect URL (we'll update this after deploying frontend):
   - For now, add: `https://your-app.vercel.app/auth-callback.html`
   - (We'll get the exact URL in Step 3)

3. Set **Site URL** to: `https://your-app.vercel.app`

---

## Step 3: Deploy Frontend to Vercel - 5 minutes

### 3.1 Sign Up
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" → Choose "Continue with GitHub"
3. Authorize Vercel to access your repositories

### 3.2 Deploy
1. Click **"Add New Project"**
2. Find and select your `atomic-crm` repository
3. Vercel will auto-detect it's a Vite app ✅

### 3.3 Add Environment Variables
Click **"Environment Variables"** and add:

```
VITE_SUPABASE_URL = https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY = your_anon_key_from_supabase
VITE_IS_DEMO = false
```

(Get these from Supabase dashboard → Settings → API)

### 3.4 Deploy!
Click **"Deploy"** - that's it! 🎉

Your app will be live in ~2 minutes at:
**`https://your-project-name.vercel.app`**

---

## Step 4: Update Supabase Redirect URL - 1 minute

1. Go back to Supabase dashboard
2. **Authentication** → **URL Configuration**
3. Update redirect URL to: `https://your-project-name.vercel.app/auth-callback.html`
4. Update Site URL to: `https://your-project-name.vercel.app`
5. Save

---

## ✅ Done!

Visit your Vercel URL and create your first admin account!

---

## 🔄 Auto-Deployments

Every time you push to `main` branch:
- ✅ Vercel automatically deploys frontend changes
- ⚠️ Database changes need manual deployment:
  ```bash
  npx supabase db push
  npx supabase functions deploy
  ```

---

## 🆓 Free Tier Limits

### Supabase Free Tier:
- ✅ 500MB database storage
- ✅ 2GB bandwidth/month
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests

### Vercel Free Tier:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domains

**Perfect for your CRM!** 🚀

---

## 🆘 Troubleshooting

**"Supabase URL not found" error:**
- Make sure you set `VITE_SUPABASE_URL` in Vercel environment variables

**"Authentication failed" error:**
- Check that redirect URL in Supabase matches your Vercel URL exactly

**"Database connection failed":**
- Make sure you ran `npx supabase db push` to deploy your database schema

---

## 📚 Need More Help?

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Full Deployment Guide**: See `DEPLOYMENT_GUIDE.md`
