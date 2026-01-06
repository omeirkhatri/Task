# 🚀 Deploy Edge Function - Quick Guide

## Deploy the `users` function to fix user deletion

### Option 1: Using Access Token (Easiest - No Login Required)

1. **Get your access token:**
   - Go to: https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Copy the token

2. **Deploy the function:**
   ```bash
   export SUPABASE_ACCESS_TOKEN=your_token_here
   npx supabase functions deploy users --project-ref vzwcxhydyqdudngxyres
   ```

### Option 2: Login First, Then Deploy

1. **Login to Supabase CLI:**
   ```bash
   npx supabase login
   ```
   (This will open your browser for authentication)

2. **Link your project (if not already linked):**
   ```bash
   npx supabase link --project-ref vzwcxhydyqdudngxyres --password YOUR_DB_PASSWORD
   ```
   (Get password from: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/settings/database)

3. **Deploy the function:**
   ```bash
   npx supabase functions deploy users
   ```

### Option 3: Deploy All Functions

If you want to deploy all functions at once:
```bash
npx supabase functions deploy
```

This will deploy:
- `users` (the one we just fixed)
- `installment-reminders`
- `postmark`
- `updatePassword`

## Verify Deployment

After deploying, check:
1. Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/functions
2. You should see the `users` function listed
3. Try deleting a user again - it should work now!

## Troubleshooting

**Error: "Not authenticated"**
- Use Option 1 (access token) or run `npx supabase login` first

**Error: "Project not linked"**
- Run: `npx supabase link --project-ref vzwcxhydyqdudngxyres --password YOUR_PASSWORD`

**Error: "Permission denied"**
- Make sure you're logged into the correct Supabase account
- Verify you have access to project `vzwcxhydyqdudngxyres`

## Quick Test Command

Check if you're authenticated:
```bash
npx supabase projects list
```

If you see `vzwcxhydyqdudngxyres` in the list, you're good to deploy!

