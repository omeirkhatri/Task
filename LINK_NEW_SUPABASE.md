# 🔗 Link to New Supabase Account & Project

Follow these steps to link your project to a new Supabase account and project.

## Step 1: Login to New Supabase Account

1. **Login to Supabase CLI:**
   ```bash
   npx supabase login
   ```
   This will open your browser for authentication. Make sure you're logged into the **new Supabase account** you want to use.

2. **Verify you're logged in:**
   ```bash
   npx supabase projects list
   ```
   You should see projects from your new account.

## Step 2: Get Your New Project Information

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your new project (or create one if needed)

2. **Get Project Reference:**
   - The project ref is in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
   - Or go to **Settings** → **General** → **Reference ID**
   - Copy the project ref (e.g., `abcdefghijklmnop`)

3. **Get Database Password:**
   - Go to: **Settings** → **Database**
   - If you don't remember the password, click **"Reset database password"**
   - Copy the password (you'll need it in the next step)

4. **Get API Credentials (for later):**
   - Go to: **Settings** → **API**
   - Copy:
     - **Project URL** (e.g., `https://YOUR_PROJECT_REF.supabase.co`)
     - **anon/public key** (starts with `eyJ...`)

## Step 3: Link the New Project

Run this command (replace `YOUR_PROJECT_REF` and `YOUR_DB_PASSWORD`):

```bash
npx supabase link --project-ref YOUR_PROJECT_REF --password YOUR_DB_PASSWORD
```

**Example:**
```bash
npx supabase link --project-ref abcdefghijklmnop --password mySecurePassword123
```

## Step 4: Verify the Link

Check that the project is linked:

```bash
npx supabase projects list
```

You should see your new project with a checkmark (✓) in the LINKED column.

## Step 5: Deploy Database Schema

Apply all migrations to your new project:

```bash
npx supabase db push
```

This will apply all migration files from `supabase/migrations/` to your new database.

## Step 6: Deploy Edge Functions

Deploy all edge functions:

```bash
npx supabase functions deploy
```

Or deploy specific functions:
```bash
npx supabase functions deploy users
npx supabase functions deploy installment-reminders
npx supabase functions deploy postmark
npx supabase functions deploy updatePassword
```

## Step 7: Update Environment File

Create or update `.env.production.local` with your new project credentials:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_IS_DEMO=false
```

**Important:** Replace `YOUR_PROJECT_REF` and `your_anon_key_here` with the values from Step 2.

## Troubleshooting

### Error: "Already logged in with different account"
If you need to logout first:
```bash
# Check current login status
npx supabase projects list

# If you see wrong projects, you may need to logout
# Note: Supabase CLI doesn't have explicit logout, but you can:
# 1. Clear browser cookies for supabase.com
# 2. Or use access token method (see below)
```

### Error: "Project not found"
- Verify the project ref is correct
- Make sure you're logged into the correct Supabase account
- Check that the project exists in your dashboard

### Error: "Authentication failed"
- Run `npx supabase login` again
- Make sure you complete the browser authentication
- Try using access token method (see DEPLOY_FUNCTION.md)

### Error: "Database password incorrect"
- Reset the password in Supabase Dashboard → Settings → Database
- Use the new password in the link command

## Alternative: Using Access Token

If login doesn't work, you can use an access token:

1. **Get access token:**
   - Go to: https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Copy the token

2. **Link using token:**
   ```bash
   export SUPABASE_ACCESS_TOKEN=your_token_here
   npx supabase link --project-ref YOUR_PROJECT_REF --password YOUR_DB_PASSWORD
   ```

## Next Steps

After linking:
- ✅ Database migrations applied
- ✅ Edge functions deployed
- ✅ Environment file updated
- ⚠️ Don't forget to configure Auth redirect URLs in Supabase Dashboard
- ⚠️ Update Vercel environment variables if deploying

