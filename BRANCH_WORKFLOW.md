# Branch Workflow Guide

## Overview
This project uses a branch-based workflow to separate development work from the live production version on Vercel.

## Current Setup

- **`main` branch**: Production branch - automatically deploys to Vercel (uses Supabase Cloud)
- **`development` branch**: Development branch - safe to work on without affecting production (uses local Supabase CLI)

## ⚠️ Important: Database Configuration

**Development branch uses LOCAL database, main branch uses CLOUD database.**

- **On `development` branch**: Use local Supabase CLI (`npx supabase start`)
  - **DO NOT** create `.env.production.local` on this branch
  - App connects to `http://127.0.0.1:54321` (local)
  
- **On `main` branch**: Vercel uses Supabase Cloud
  - Environment variables set in Vercel dashboard
  - App connects to `https://*.supabase.co` (cloud)

📖 **See `DATABASE_SEPARATION.md` for detailed database setup instructions.**

## Workflow

### Working on Development Branch

1. **Make sure you're on the development branch:**
   ```bash
   git checkout development
   ```

2. **Ensure you're using local database:**
   ```bash
   # Remove production env file if it exists (it's gitignored, safe to delete)
   rm -f .env.production.local
   
   # Start local Supabase
   npx supabase start
   ```

3. **Make your changes** - work freely without worrying about breaking production

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

4. **Push to remote (optional, for backup):**
   ```bash
   git push -u origin development
   ```

### When Ready to Deploy to Production

1. **Switch to main branch:**
   ```bash
   git checkout main
   ```

2. **Merge development into main:**
   ```bash
   git merge development
   ```

3. **Push to main (this will trigger Vercel deployment):**
   ```bash
   git push origin main
   ```

### Alternative: Create Pull Request (Recommended)

Instead of merging directly, you can:
1. Push your development branch: `git push origin development`
2. Create a Pull Request on GitHub/GitLab
3. Review changes before merging to main
4. Merge the PR, which will trigger Vercel deployment

## Vercel Configuration

### Option 1: Configure Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Git**
3. Under **Production Branch**, ensure it's set to `main`
4. Under **Ignored Build Step**, you can add:
   ```
   git diff HEAD^ HEAD --quiet ./
   ```
   (This prevents builds when only non-code files change)

### Option 2: Configure via vercel.json

The current `vercel.json` doesn't restrict branches. Vercel by default deploys all branches as preview deployments. To prevent this:

1. In Vercel Dashboard → Settings → Git
2. Disable "Automatic Preview Deployments" for non-production branches
3. Or set "Production Branch" to `main` only

### Option 3: Use Vercel CLI (if needed)

If you have Vercel CLI installed:
```bash
vercel --prod  # Only deploy to production from main
```

## Best Practices

1. **Always work on `development` branch** for new features
2. **Test thoroughly** before merging to `main`
3. **Keep `main` stable** - only merge when code is ready
4. **Use descriptive commit messages**
5. **Consider feature branches** for larger features:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Quick Reference

```bash
# Switch to development branch
git checkout development

# Create a new feature branch from development
git checkout -b feature/new-feature

# Switch back to main
git checkout main

# See all branches
git branch -a

# See current branch
git branch
```

## Troubleshooting

### If you accidentally commit to main:
1. Create a branch from your current position: `git checkout -b development`
2. Reset main to previous commit: `git checkout main && git reset --hard origin/main`
3. Continue working on development branch

### If Vercel still deploys from development:
- Check Vercel Dashboard → Settings → Git
- Ensure "Production Branch" is set to `main`
- Disable automatic preview deployments if desired

