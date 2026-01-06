# 🔗 How to Link BestDOC Task Manager Project

The project selector is only showing "Atomic CRM", but we need to link "BestDOC Task Manager" (vzwcxhydyqdudngxyres).

## Solution: Link Directly with Project Ref and Password

You need to link the project directly using the `--password` flag. Here's how:

### Step 1: Get Your Database Password

1. Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/settings/database
2. If you don't remember the password, click "Reset database password"
3. Copy the password (you'll need it in the next step)

### Step 2: Link the Project Directly

Run this command (replace `YOUR_DB_PASSWORD` with your actual password):

```bash
npx supabase link --project-ref vzwcxhydyqdudngxyres --password YOUR_DB_PASSWORD
```

**Example:**
```bash
npx supabase link --project-ref vzwcxhydyqdudngxyres --password mySecurePassword123
```

### Step 3: Verify the Link

After linking, verify it worked:

```bash
npx supabase projects list
```

You should see `vzwcxhydyqdudngxyres` with a checkmark in the LINKED column.

### Step 4: Deploy

Once linked, you can deploy:

```bash
# Deploy database migrations
npx supabase db push

# Deploy edge functions
npx supabase functions deploy
```

## Alternative: If Direct Linking Doesn't Work

If you get permission errors, the project might be in a different organization. In that case:

1. **Use Supabase Dashboard SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/sql/new
   - Copy and paste each migration file from `supabase/migrations/`
   - Run them in order (by timestamp)

2. **Deploy Functions via Dashboard:**
   - Go to: https://supabase.com/dashboard/project/vzwcxhydyqdudngxyres/functions
   - Create and deploy each function manually

## Troubleshooting

### Error: "Your account does not have the necessary privileges"
- The project might be in a different organization
- Try accessing it through the Supabase dashboard first
- Make sure you're logged into the correct account

### Error: "Cannot find project ref"
- Make sure you're using the correct project ref: `vzwcxhydyqdudngxyres`
- Verify the project exists in your Supabase dashboard

### Project Not Showing in List
- The project might be in a different organization
- Use direct linking with `--project-ref` and `--password` flags
- Or deploy manually through the dashboard

