# 🚀 Free Deployment Guide for Atomic CRM

This guide covers **100% FREE deployment** for your Atomic CRM with minimal restrictions.

## 📋 Overview

Your app consists of:
- **Frontend**: Static React/Vite app (deploy to Vercel/Netlify - FREE)
- **Backend**: Supabase cloud (FREE tier available)

**Total Cost: $0/month** ✅

The frontend builds to static files in the `dist` folder, which can be deployed to any static hosting service.

---

## 🎯 Complete Setup Guide (Start Here!)

### Part 1: Set Up Supabase Cloud (Backend) - FREE

**Supabase Free Tier Includes:**
- ✅ 500MB database storage
- ✅ 2GB bandwidth/month
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests
- ✅ Authentication included
- ✅ File storage included

#### Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** → **"Sign up"**
3. Sign up with GitHub (recommended) or email
4. **No credit card required!** ✅

#### Step 2: Set Up Your Project (Automated)

Your project includes an automated script to set up Supabase cloud:

```bash
make supabase-remote-init
```

This script will:
- ✅ Log you into Supabase
- ✅ Create a new project
- ✅ Set up the database with all migrations
- ✅ Deploy edge functions
- ✅ Create `.env.production.local` with your credentials

**What you'll need:**
- A project name (e.g., "atomic-crm")
- A database password (the script can generate one)

#### Step 2 Alternative: Manual Setup

If you prefer manual setup:

1. **Create project manually:**
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Click **"New Project"**
   - Enter project name and database password
   - Choose a region close to you
   - Click **"Create new project"** (takes ~2 minutes)

2. **Get your credentials:**
   - Go to **Settings** → **API**
   - Copy:
     - **Project URL** (looks like `https://xxxxx.supabase.co`)
     - **anon/public key** (long string starting with `eyJ...`)

3. **Link your local project:**
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Find PROJECT_REF in your Supabase dashboard URL)

4. **Deploy database and functions:**
   ```bash
   npx supabase db push
   npx supabase functions deploy
   ```

5. **Create `.env.production.local` file:**
   ```bash
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

#### Step 3: Configure Authentication Callback

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your frontend URL to **Redirect URLs**:
   - If deploying to Vercel: `https://your-app.vercel.app/auth-callback.html`
   - If deploying to Netlify: `https://your-app.netlify.app/auth-callback.html`
   - If deploying to GitHub Pages: `https://your-username.github.io/atomic-crm/auth-callback.html`

4. Set **Site URL** to your frontend URL (same as above, but without `/auth-callback.html`)

#### Step 4: (Optional) Set Up Email Provider

For production, you'll want to configure email sending:

1. Go to **Authentication** → **SMTP Settings**
2. Choose a free email service:
   - **Resend** (recommended - 3,000 emails/month free)
   - **Brevo** (300 emails/day free)
   - Or use Supabase's built-in email (limited, but works for testing)

3. Configure SMTP settings in Supabase dashboard

**Note:** For testing, you can skip this step - Supabase has a basic email service that works for development.

---

### Part 2: Deploy Frontend to Vercel - FREE

## 🏆 Recommended: Vercel (Best Free Option)

**Why Vercel?**
- ✅ **100% Free** for personal projects
- ✅ **Zero configuration** - auto-detects Vite
- ✅ **Unlimited bandwidth** on free tier
- ✅ **Automatic HTTPS** and custom domains
- ✅ **Instant deployments** from Git
- ✅ **No credit card required**
- ✅ **100GB bandwidth/month** (more than enough for most apps)

### Quick Setup (5 minutes):

1. **Sign up**: Go to [vercel.com](https://vercel.com) and sign up with GitHub

2. **Import your repository**:
   - Click "Add New Project"
   - Select your `atomic-crm` repository
   - Vercel will auto-detect it's a Vite app

3. **Configure environment variables**:
   Add these in Vercel dashboard → Settings → Environment Variables:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase
   VITE_IS_DEMO=false
   ```
   (Get these from your Supabase dashboard → Settings → API)

4. **Deploy**: Click "Deploy" - that's it!

5. **Auto-deployments**: Every push to `main` branch automatically deploys

**Your app will be live at**: `https://your-project-name.vercel.app`

---

## ✅ You're Done!

After deployment:
1. Visit your Vercel URL
2. Create your first admin account
3. Start using your CRM!

**Your app is now live and 100% free!** 🎉

---

## 🥈 Alternative: Netlify (Also Excellent)

**Why Netlify?**
- ✅ **100% Free** for personal projects
- ✅ **100GB bandwidth/month**
- ✅ **300 build minutes/month** (plenty for most projects)
- ✅ **Automatic HTTPS** and custom domains
- ✅ **Drag-and-drop** or Git-based deployments

### Quick Setup:

1. **Sign up**: Go to [netlify.com](https://netlify.com) and sign up with GitHub

2. **Deploy**:
   - Option A: Drag & drop your `dist` folder after running `npm run build`
   - Option B: Connect to GitHub repo and configure:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`

3. **Add environment variables** (same as Vercel)

**Your app will be live at**: `https://your-project-name.netlify.app`

---

## 🥉 Alternative: Cloudflare Pages (Most Generous)

**Why Cloudflare Pages?**
- ✅ **100% Free** - unlimited bandwidth!
- ✅ **Unlimited builds**
- ✅ **Fast global CDN**
- ✅ **No restrictions** on free tier

### Quick Setup:

1. **Sign up**: Go to [pages.cloudflare.com](https://pages.cloudflare.com)

2. **Connect repository** and configure:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

3. **Add environment variables** (same as Vercel)

**Your app will be live at**: `https://your-project-name.pages.dev`

---

## 📦 Option 4: GitHub Pages (Already Configured)

**Current Status**: You already have GitHub Actions configured for GitHub Pages!

**Limitations**:
- ⚠️ **1GB storage limit**
- ⚠️ **100GB bandwidth/month** (soft limit)
- ⚠️ **No server-side features**
- ✅ **Completely free**

**To use it**: Just push to `main` branch (if secrets are configured) or run:
```bash
npm run ghpages:deploy
```

**Your app will be live at**: `https://your-username.github.io/atomic-crm/`

---

## 🔧 Manual Deployment Steps (Any Platform)

If you prefer manual deployment:

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Upload the `dist` folder** to your hosting service

3. **Configure environment variables** in your hosting dashboard

---

## 🌐 Custom Domain Setup

All platforms above support custom domains for free:

- **Vercel**: Add domain in project settings → Domains
- **Netlify**: Add domain in Site settings → Domain management
- **Cloudflare Pages**: Add domain in Pages settings
- **GitHub Pages**: Add `CNAME` file in repository

---

## 💰 Cost Comparison

| Platform | Free Tier | Bandwidth | Builds | Best For |
|----------|-----------|-----------|--------|----------|
| **Vercel** | ✅ Free | 100GB/month | Unlimited | Easiest setup |
| **Netlify** | ✅ Free | 100GB/month | 300 min/month | Good balance |
| **Cloudflare Pages** | ✅ Free | **Unlimited** | Unlimited | High traffic |
| **GitHub Pages** | ✅ Free | 100GB/month | Via Actions | Already configured |

---

## 🎯 Recommendation

**For your use case, I recommend Vercel** because:
1. Zero configuration needed
2. Automatic deployments from Git
3. Generous free tier
4. Best developer experience
5. Perfect for React/Vite apps

**Setup time**: ~5 minutes

---

## 📝 Environment Variables Checklist

Make sure to set these in your hosting platform:

- ✅ `VITE_SUPABASE_URL` - Your Supabase project URL (from Supabase dashboard)
- ✅ `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key (from Supabase dashboard)
- ✅ `VITE_IS_DEMO` - Set to `false` for production
- ⚠️ `VITE_INBOUND_EMAIL` - Optional, for email features

**Where to find Supabase credentials:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon/public key**

---

## 🚨 Important Notes

1. **Supabase Backend**: You MUST set up Supabase cloud first (see Part 1 above)
2. **CORS**: Supabase automatically allows requests from your configured redirect URLs
3. **Build Output**: The `dist` folder contains everything needed - just upload it
4. **SPA Routing**: All platforms above support client-side routing automatically
5. **Database Password**: Save your Supabase database password securely - you'll need it for migrations

## 🔄 Updating Your App

After making changes:

1. **Update database** (if you changed migrations):
   ```bash
   npx supabase db push
   npx supabase functions deploy
   ```

2. **Deploy frontend**:
   - Vercel/Netlify: Just push to GitHub - auto-deploys!
   - Manual: Run `npm run build` and upload `dist` folder

---

## 🆘 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages

---

**Ready to deploy?** Start with Vercel - it's the fastest and easiest option! 🚀
