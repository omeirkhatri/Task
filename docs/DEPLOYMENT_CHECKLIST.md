# ✅ Deployment Checklist

Use this checklist to ensure you've completed all steps for deployment.

## 📋 Pre-Deployment

- [ ] GitHub repository is set up and code is pushed
- [ ] Node.js is installed locally
- [ ] You can run `npm run build` successfully

---

## 🔵 Step 1: Supabase Setup (Backend)

- [ ] Created Supabase account at [supabase.com](https://supabase.com)
- [ ] Created new Supabase project
- [ ] Saved database password securely
- [ ] Ran `make supabase-remote-init` OR manually:
  - [ ] Logged in: `npx supabase login`
  - [ ] Linked project: `npx supabase link --project-ref YOUR_REF`
  - [ ] Pushed database: `npx supabase db push`
  - [ ] Deployed functions: `npx supabase functions deploy`
- [ ] Got credentials from Supabase dashboard:
  - [ ] Project URL (e.g., `https://xxxxx.supabase.co`)
  - [ ] Anon/public key
- [ ] Created `.env.production.local` file with credentials

---

## 🔵 Step 2: Supabase Configuration

- [ ] Opened Supabase dashboard → Authentication → URL Configuration
- [ ] Added redirect URL (will update after frontend deploy)
- [ ] Set Site URL (will update after frontend deploy)
- [ ] (Optional) Configured SMTP for email sending

---

## 🟢 Step 3: Frontend Deployment

### Option A: Vercel (Recommended)

- [ ] Created Vercel account at [vercel.com](https://vercel.com)
- [ ] Connected GitHub account
- [ ] Added new project from repository
- [ ] Added environment variables:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_IS_DEMO=false`
- [ ] Clicked "Deploy"
- [ ] Deployment completed successfully
- [ ] Got deployment URL (e.g., `https://your-app.vercel.app`)

### Option B: Netlify

- [ ] Created Netlify account
- [ ] Connected repository
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Added environment variables
- [ ] Deployed successfully

### Option C: Cloudflare Pages

- [ ] Created Cloudflare account
- [ ] Connected repository
- [ ] Set build command: `npm run build`
- [ ] Set build output: `dist`
- [ ] Added environment variables
- [ ] Deployed successfully

---

## 🔵 Step 4: Final Configuration

- [ ] Updated Supabase redirect URL to match frontend URL:
  - [ ] Format: `https://your-app.vercel.app/auth-callback.html`
- [ ] Updated Supabase Site URL to match frontend URL:
  - [ ] Format: `https://your-app.vercel.app`
- [ ] Tested authentication flow:
  - [ ] Can access app
  - [ ] Can create first admin account
  - [ ] Can log in

---

## ✅ Post-Deployment

- [ ] App is accessible at production URL
- [ ] Can create and log in with admin account
- [ ] Database is working (can create/view data)
- [ ] (Optional) Set up custom domain
- [ ] (Optional) Configure email provider for production

---

## 🎉 You're Live!

Your CRM is now deployed and ready to use!

---

## 📝 Notes

- **Database Password**: Keep your Supabase database password safe - you'll need it for future migrations
- **Environment Variables**: Never commit `.env.production.local` to Git - it contains secrets
- **Auto-Deployments**: Frontend auto-deploys on Git push, but database changes need manual deployment

---

## 🔄 Future Updates

When you make changes:

**Frontend changes:**
- Just push to GitHub - Vercel/Netlify auto-deploys!

**Database changes:**
```bash
npx supabase db push
npx supabase functions deploy
```

**Both:**
- Push frontend changes
- Run database commands above
