# Git & GitHub Basics - Explained Simply 🎯

## What is Version Control? (Like You're 5)

Imagine you're drawing a picture. Every time you make a good change, you take a photo of it. If you mess up later, you can look back at the photos and go back to a good version!

**Git** = Your photo album (saves snapshots of your code)
**GitHub** = Your photo album in the cloud (backup + share with others)

---

## The 3 Main Things You'll Do

### 1. **Save Your Work** (Commit)
When you've made some changes and everything works:
```bash
git add .                    # "Hey git, look at all my changes"
git commit -m "What I did"   # "Save this snapshot with a note"
git push                     # "Upload to GitHub"
```

**Example:**
```bash
git add .
git commit -m "Added new appointment feature"
git push
```

### 2. **See What Changed** (View History)
```bash
git log                      # See all your saved snapshots
git show                     # See what changed in the last save
git diff                     # See what's different right now
```

### 3. **Go Back if Something Breaks** (Revert)
```bash
git log                      # First, find the good version (copy its ID)
git checkout [version-id]    # Go back to that version
# OR
git revert [version-id]      # Undo a specific change
```

---

## Daily Workflow (Step by Step)

### When You Start Working:
```bash
git pull                     # Get latest changes from GitHub
```

### While You're Working:
- Make your changes
- Test that everything works

### When You're Done with a Feature:
```bash
# 1. See what changed
git status                   # Shows what files changed

# 2. Save your work
git add .                    # Stage all changes
git commit -m "Clear description of what you did"
# Examples:
#   "Fixed login bug"
#   "Added user profile page"
#   "Updated appointment calendar"

# 3. Upload to GitHub
git push
```

---

## Common Commands Cheat Sheet

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `git status` | See what files changed | Before committing |
| `git add .` | Mark all changes to save | Before committing |
| `git commit -m "message"` | Save a snapshot | After making changes |
| `git push` | Upload to GitHub | After committing |
| `git pull` | Download from GitHub | When starting work |
| `git log` | See all your saves | To find old versions |
| `git diff` | See what changed | To review before saving |
| `git checkout [id]` | Go back in time | When something breaks |

---

## How to See What Changed at Every Commit

### View All Commits:
```bash
git log --oneline            # Short list
git log                      # Detailed list
```

### See What Changed in a Specific Commit:
```bash
git show [commit-id]         # Shows the changes
```

### See What Changed Between Two Commits:
```bash
git diff [old-id] [new-id]
```

### On GitHub Website:
1. Go to your repository on GitHub
2. Click "Commits" (top of the page)
3. Click any commit to see what changed

---

## Going Back When Something Breaks

### Option 1: Undo Last Commit (But Keep Changes)
```bash
git reset --soft HEAD~1      # Undo commit, keep your changes
```

### Option 2: Go Back to a Specific Version
```bash
# 1. Find the good version
git log --oneline

# 2. Copy the commit ID (first 7 characters)
# Example: abc1234

# 3. Go back
git checkout abc1234         # Look at that version
# OR
git revert abc1234           # Create a new commit that undoes it
```

### Option 3: Discard All Current Changes
```bash
git restore .                # Throw away all unsaved changes
```

---

## Best Practices

✅ **DO:**
- Commit often (every time you finish a feature)
- Write clear commit messages ("Added login button" not "stuff")
- Pull before you start working
- Test before you commit

❌ **DON'T:**
- Commit broken code
- Commit without testing
- Forget to write commit messages
- Work for days without committing

---

## Your Current Situation

Right now you have:
- ✅ Git repository set up
- ✅ Connected to GitHub
- ⚠️ Many uncommitted changes

**Next Steps:**
1. Review your changes: `git status`
2. Add them: `git add .`
3. Commit: `git commit -m "Your message"`
4. Push: `git push`

---

## Need Help?

- `git help [command]` - Get help for any command
- GitHub has great visual tools - check your repo online!
- Each commit is like a save point in a video game - use them often!

