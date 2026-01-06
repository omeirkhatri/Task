# Database Separation Guide

## Overview

This guide ensures you use **local Supabase CLI** for development and **Supabase Cloud** for production, preventing accidental connections to production data.

## How It Works

The app uses environment variables to determine which database to connect to:

- **No env file or `.env.local`** → Uses local Supabase CLI (`http://127.0.0.1:54321`)
- **`.env.production.local`** → Uses Supabase Cloud (production database)
- **Vercel** → Uses environment variables from Vercel dashboard (cloud database)

## Development Branch Setup (Local Database)

### ✅ Correct Setup for Development Branch

1. **Ensure you're on the development branch:**
   ```bash
   git checkout development
   ```

2. **Make sure `.env.production.local` does NOT exist:**
   ```bash
   # Check if it exists
   ls -la .env.production.local
   
   # If it exists, remove it (it's gitignored, so safe to delete)
   rm .env.production.local
   ```

3. **Optional: Create `.env.local` for explicit local config:**
   ```bash
   # Get your local Supabase credentials
   npx supabase status
   
   # Create .env.local with local credentials
   cat > .env.local << EOF
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=your_local_anon_key_from_supabase_status
   VITE_IS_DEMO=false
   EOF
   ```

4. **Start local Supabase:**
   ```bash
   make start-supabase
   # or
   npx supabase start
   ```

5. **Verify you're using local database:**
   - Check the URL in your browser console or network tab
   - Should show: `http://127.0.0.1:54321`
   - NOT: `https://*.supabase.co`

### ❌ What NOT to Do on Development Branch

- **DON'T** create `.env.production.local` on development branch
- **DON'T** set `VITE_SUPABASE_URL` to a cloud URL
- **DON'T** commit any `.env` files (they're gitignored, but double-check)

## Production Branch Setup (Cloud Database)

### For Vercel Deployments

Vercel uses environment variables from the dashboard, NOT from `.env.production.local`:

1. **Set environment variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = `https://YOUR_PROJECT_REF.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = Your cloud anon key
     - `VITE_IS_DEMO` = `false`
   - Apply to: **Production**, **Preview**, **Development**

2. **`.env.production.local` is NOT needed for Vercel**
   - Vercel ignores local files
   - It uses dashboard environment variables

### For Local Testing with Cloud Database

If you want to test locally against cloud database (on main branch):

1. **Create `.env.production.local` (gitignored):**
   ```bash
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your_cloud_anon_key
   VITE_IS_DEMO=false
   ```

2. **⚠️ WARNING:** This connects to production data!
   - Only do this when testing production features
   - Be very careful with writes/deletes
   - Consider using a staging Supabase project instead

## Safety Checklist

### Before Starting Development Work

- [ ] On `development` branch: `git checkout development`
- [ ] No `.env.production.local` file exists
- [ ] Local Supabase is running: `npx supabase status`
- [ ] App URL shows `http://127.0.0.1:54321` (not `*.supabase.co`)

### Before Merging to Main

- [ ] Tested all changes on local database
- [ ] No `.env.production.local` committed (it's gitignored, but verify)
- [ ] Ready to deploy to production

### After Merging to Main

- [ ] Vercel automatically deploys with cloud database
- [ ] Verify production URL works correctly
- [ ] Check Vercel logs for any errors

## Quick Commands

### Check Current Database Connection

```bash
# Check what Supabase URL the app is using
grep -r "VITE_SUPABASE_URL" .env* 2>/dev/null || echo "No .env files found - using defaults"

# Check if local Supabase is running
npx supabase status

# Check current branch
git branch --show-current
```

### Switch to Local Database

```bash
# Remove production env file
rm -f .env.production.local

# Start local Supabase
npx supabase start

# Restart dev server
npm run dev
```

### Verify Database Connection

1. **In Browser DevTools:**
   - Open Network tab
   - Look for requests to Supabase
   - Local: `http://127.0.0.1:54321`
   - Cloud: `https://*.supabase.co`

2. **In Code:**
   ```javascript
   // Add this temporarily to see what URL is being used
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   ```

## Environment File Priority

Vite loads environment files in this order (later files override earlier):

1. `.env` (base, rarely used)
2. `.env.local` (local overrides, gitignored)
3. `.env.[mode]` (e.g., `.env.development`)
4. `.env.[mode].local` (e.g., `.env.production.local`, gitignored)

**For development branch:**
- Use `.env.local` with local Supabase URL (optional)
- **Never** use `.env.production.local`

**For production:**
- Vercel uses dashboard environment variables
- `.env.production.local` only for local testing with cloud DB

## Troubleshooting

### "I accidentally connected to cloud database"

1. **Stop the dev server**
2. **Remove `.env.production.local`:**
   ```bash
   rm .env.production.local
   ```
3. **Restart dev server:**
   ```bash
   npm run dev
   ```
4. **Verify:** Check network tab for `127.0.0.1:54321`

### "Local Supabase not starting"

```bash
# Reset local Supabase
npx supabase stop
npx supabase start

# Or use makefile
make stop-supabase
make start-supabase
```

### "How do I know which database I'm using?"

1. **Check environment variable:**
   ```bash
   echo $VITE_SUPABASE_URL
   # or
   cat .env.local 2>/dev/null || cat .env.production.local 2>/dev/null || echo "No env file"
   ```

2. **Check browser console:**
   - Open DevTools → Console
   - Look for Supabase connection logs
   - Check Network tab for API calls

3. **Check Supabase status:**
   ```bash
   npx supabase status
   # Shows local Supabase URL if running
   ```

## Best Practices

1. **Always work on `development` branch** with local database
2. **Never commit `.env` files** (already gitignored)
3. **Use local Supabase CLI** for all development
4. **Test thoroughly** before merging to main
5. **Let Vercel handle production** with dashboard env vars
6. **Consider a staging Supabase project** for testing cloud features

## Summary

| Branch | Database | Config File | Command |
|--------|----------|-------------|---------|
| `development` | Local (CLI) | `.env.local` (optional) | `npx supabase start` |
| `main` (local test) | Cloud | `.env.production.local` | `npm run dev` |
| `main` (Vercel) | Cloud | Vercel dashboard | Auto-deploy |

**Remember:** Development branch = Local DB. Main branch = Cloud DB (via Vercel).

