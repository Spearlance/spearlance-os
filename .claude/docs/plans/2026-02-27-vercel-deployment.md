# Vercel SPA Deployment Plan


**Goal:** Deploy SpearlanceOS Vite SPA to Vercel at os.spearlance.com, pointing to existing remote Supabase.

**Architecture:** Static SPA on Vercel (auto-deploy on push to main) with all server logic in Supabase Edge Functions. No Vercel serverless functions needed.

**Tech Stack:** Vite, React, Vercel CLI, Supabase (remote)

---

### Task 1: Add .vercel/ to .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add .vercel/ to gitignore**

Add `.vercel` to the gitignore file under the existing environment files section:

```
# Vercel
.vercel
```

**Step 2: Verify**

Run: `grep -n "vercel" .gitignore`
Expected: Shows the new `.vercel` line

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .vercel to gitignore"
```

---

### Task 2: Link Vercel project

**Step 1: Link the project**

Run: `npx vercel link`

Select:
- Scope: `spearlance` (team)
- Link to existing project? No — create new
- Project name: `spearlance-os`
- Directory: `./`

This creates `.vercel/project.json` with `projectId` and `orgId`.

**Step 2: Verify**

Run: `cat .vercel/project.json`
Expected: JSON with `projectId` and `orgId` fields

---

### Task 3: Create vercel.json

**Files:**
- Create: `vercel.json`

**Step 1: Write vercel.json**

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Step 2: Verify JSON is valid**

Run: `python3 -c "import json; json.load(open('vercel.json')); print('valid')"`
Expected: `valid`

**Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json for SPA deployment"
```

---

### Task 4: Create .env with production values

The `.env` file doesn't exist locally — only `.env.example`. The user needs to provide actual values for 13 VITE_* vars before we can push to Vercel.

**Required vars (from .env.example):**

| Var | Source |
|-----|--------|
| `VITE_SUPABASE_PROJECT_ID` | Supabase dashboard → Settings → General |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard → Settings → API → `anon` key |
| `VITE_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `VITE_CAL_OAUTH_CLIENT_ID` | Cal.com dashboard |
| `VITE_CAL_ORG_ID` | Cal.com dashboard |
| `VITE_CAL_API_URL` | `https://api.cal.com/v2` (default) |
| `VITE_CAL_REFRESH_URL` | Cal.com OAuth config |
| `VITE_STRIPE_WEBSITE_ADDON_PRICE_ID` | Stripe dashboard → Products |
| `VITE_STRIPE_STARTER_MONTHLY_PRICE_ID` | Stripe dashboard → Products |
| `VITE_STRIPE_STARTER_ANNUAL_PRICE_ID` | Stripe dashboard → Products |
| `VITE_STRIPE_UNLIMITED_MONTHLY_PRICE_ID` | Stripe dashboard → Products |
| `VITE_STRIPE_UNLIMITED_ANNUAL_PRICE_ID` | Stripe dashboard → Products |
| `VITE_APP_URL` | `https://os.spearlance.com` |

**Step 1: Ask user to create .env**

Prompt: "I need a `.env` file with your production values. Copy `.env.example` to `.env` and fill in the actual values. I'll push them to Vercel."

**Step 2: Verify .env exists and has values**

Run: `cat .env | grep "^VITE_" | grep -v "=$" | wc -l`
Expected: 13 (all vars have values)

---

### Task 5: Push env vars to Vercel

**Step 1: Push each VITE_* var to Vercel production**

For each var in `.env`, run:

```bash
echo "<value>" | npx vercel env add <VAR_NAME> production
```

Script approach (reads .env and pushes all):

```bash
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  echo "$value" | npx vercel env add "$key" production --force
done < .env
```

**Step 2: Verify all vars are set**

Run: `npx vercel env ls`
Expected: All 13 VITE_* vars listed under production scope

---

### Task 6: Deploy to production

**Step 1: Deploy**

Run: `npx vercel --prod`

Expected: Build succeeds, deployment URL returned (e.g., `spearlance-os-xxx.vercel.app`)

**Step 2: Verify deployment**

Run: `curl -sI <deployment-url> | head -5`
Expected: `HTTP/2 200`

**Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: vercel deployment config"
```

---

### Task 7: Add custom domain

**Step 1: Add domain to Vercel**

Run: `npx vercel domains add os.spearlance.com`

This will output DNS records to configure.

**Step 2: Present DNS instructions to user**

The user needs to add either:
- A `CNAME` record: `os` → `cname.vercel-dns.com`
- Or an `A` record if apex domain

**Step 3: Verify domain (after DNS propagation)**

Run: `npx vercel domains verify os.spearlance.com`
Expected: Domain verified

---

### Task 8: Verify live site

**Step 1: Check the production URL**

Run: `curl -sI https://os.spearlance.com | head -10`
Expected: `HTTP/2 200` with Vercel headers

**Step 2: Check SPA routing works**

Run: `curl -sI https://os.spearlance.com/dashboard | head -5`
Expected: `HTTP/2 200` (SPA rewrite serves index.html)

**Step 3: Push branch and create PR**

```bash
env -u GITHUB_TOKEN git push origin <branch>
```

Then create PR via REST API.
