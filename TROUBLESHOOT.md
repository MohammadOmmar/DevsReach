# 🔧 Troubleshooting Render Deployment

## Current Issue: 502/Connection Error

Your site at `https://safeschoolbus-kashmir.onrender.com` is returning a 502 error. Here's how to fix it:

---

## Step 1: Check Render Logs (REQUIRED)

1. **Go to**: https://dashboard.render.com
2. **Click on**: `safeschoolbus-kashmir` service
3. **Click on**: "Logs" tab (left sidebar)
4. **Look for errors** in red text
5. **Share the error** with me so I can help fix it

**Common errors to look for:**
- "Cannot find module"
- "npm install failed"
- "Build failed"
- "Port not listening"

---

## Step 2: Verify Environment Variables

In Render dashboard, go to your service → "Environment" tab and verify these EXACT variables exist:

```
NODE_ENV = production
PORT = 3000
JWT_SECRET = (any random string)
SENDGRID_API_KEY = SG.xxxxx (your actual key)
EMAIL_FROM = your-verified-email@domain.com
EMAIL_FROM_NAME = Safe School Bus Kashmir
```

**Common mistakes:**
- Typos in variable names
- Missing quotes around values
- Extra spaces in values

---

## Step 3: Check Build Settings

In Render dashboard → "Settings" tab:

**Build Command** should be:
```
npm install && cd frontend && npm install && npm run build
```

**Start Command** should be:
```
node server.js
```

**Node Version**: Should be 18+ (auto-detected from package.json)

---

## Step 4: Common Fixes

### Fix 1: Manual Redeploy
1. In Render dashboard, click "Manual Deploy" → "Deploy latest commit"
2. Wait 3-5 minutes
3. Check logs again

### Fix 2: Clear Build Cache
1. In Render dashboard → "Settings"
2. Click "Clear build cache"
3. Click "Manual Deploy"

### Fix 3: Check if Frontend Built Successfully
The build should show:
```
✓ built in X.XXs
dist/index.html
dist/assets/index-XXXXX.css
dist/assets/index-XXXXX.js
```

If you see errors during build, share them with me.

---

## Step 5: Verify Local Build Works

Run these commands locally to test:

```bash
cd "c:\Users\moham\OneDrive\Desktop\Hackathon\Bus Tracker"
npm install
cd frontend && npm install && npm run build && cd ..
node server.js
```

Then open http://localhost:3000 - if it works locally but not on Render, it's an environment issue.

---

## What to Share With Me

If it's still not working, please share:

1. **Screenshot of Render logs** (the error messages)
2. **Screenshot of Environment Variables** in Render
3. **Screenshot of Build Settings** in Render
4. **Does it work locally?** (run `node server.js` and test)

---

## Expected Behavior

After successful deployment:
1. Build completes (2-3 minutes)
2. Logs show: "Safe School Bus API and app are running at http://localhost:3000"
3. Site loads at https://safeschoolbus-kashmir.onrender.com
4. You see the login page

---

## Quick Checklist

- [ ] Render logs checked for errors
- [ ] All 6 environment variables set correctly
- [ ] Build command is correct
- [ ] Start command is correct
- [ ] Manual redeploy attempted
- [ ] Build cache cleared
- [ ] Local build tested

---

**Most likely issue**: Missing or incorrect environment variables, especially SENDGRID_API_KEY or EMAIL_FROM.

**Next step**: Check Render logs and share the error with me!