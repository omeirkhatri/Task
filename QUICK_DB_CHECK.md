# Quick Database Safety Check

## ⚠️ Current Status

You have `.env.production.local` in your project. This file connects to **Supabase Cloud** (production database).

## On Development Branch

**You should NOT have `.env.production.local` on the development branch.**

### Quick Fix

```bash
# Check current branch
git branch --show-current

# If on development branch, remove production env file
rm .env.production.local

# Verify it's gone
ls -la .env.production.local  # Should show "No such file"

# Start local Supabase
npx supabase start

# Verify local Supabase is running
npx supabase status
```

## How to Verify You're Using Local Database

1. **Check environment:**
   ```bash
   # Should show nothing or localhost URL
   cat .env.local 2>/dev/null | grep SUPABASE_URL || echo "No .env.local - using defaults"
   ```

2. **Check Supabase status:**
   ```bash
   npx supabase status
   # Should show: API URL: http://127.0.0.1:54321
   ```

3. **In browser DevTools:**
   - Open Network tab
   - Look for API calls
   - Should see: `http://127.0.0.1:54321`
   - Should NOT see: `https://*.supabase.co`

## Safe Development Setup

```bash
# 1. Ensure on development branch
git checkout development

# 2. Remove production env file
rm -f .env.production.local

# 3. Start local Supabase
npx supabase start

# 4. Optional: Create .env.local with explicit local config
npx supabase status  # Get the anon key
# Then create .env.local with:
# VITE_SUPABASE_URL=http://127.0.0.1:54321
# VITE_SUPABASE_ANON_KEY=<from supabase status>

# 5. Start dev server
npm run dev
```

## Remember

- **Development branch** = Local database (`127.0.0.1:54321`)
- **Main branch** = Cloud database (via Vercel env vars)
- **`.env.production.local`** = Cloud database (only for testing on main branch locally)

