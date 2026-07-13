# 🚀 Deploy on Fly.io - Complete Guide

## ⏱️ Total Time: 10 Minutes

---

## PART 1: Install Fly.io CLI (2 minutes)

### Windows Installation:

1. **Open PowerShell as Administrator**
2. **Run this command**:
   ```powershell
   iwr https://fly.io/install.ps1 -UseBasicParsing | iex
   ```
3. **Restart PowerShell** after installation
4. **Verify installation**:
   ```powershell
   fly --version
   ```

### Alternative: Download Directly
- Go to: https://fly.io/docs/hands-on/install-flyctl/
- Download Windows installer
- Run installer
- Restart terminal

---

## PART 2: Sign Up for Fly.io (2 minutes)

1. **Open terminal/PowerShell**
2. **Run**:
   ```bash
   fly auth signup
   ```
3. **Choose**: Sign up with GitHub (easiest)
4. **Authorize** Fly.io to access your GitHub
5. **You're signed up!**

**Already have an account?**
```bash
fly auth login
```

---

## PART 3: Prepare Your App (1 minute)

1. **Navigate to your project folder**:
   ```bash
   cd "c:\Users\moham\OneDrive\Desktop\Hackathon\Bus Tracker"
   ```

2. **Initialize Fly.io**:
   ```bash
   fly launch
   ```

3. **When prompted**:
   - **App name**: `safeschoolbus-kashmir` (or any unique name)
   - **Organization**: Select your account
   - **Region**: Choose closest to you (e.g., `iad` for Washington DC, `lhr` for London)
   - **Postgres**: No (we don't need it)
   - **Redis**: No (we don't need it)
   - **Deploy now**: No (we need to set secrets first)

4. **This creates**: `fly.toml` file (already created in your project)

---

## PART 4: Set Environment Variables (3 minutes)

### 4.1 Set Required Secrets

Run these commands **one by one**:

```bash
fly secrets set NODE_ENV=production
```

```bash
fly secrets set PORT=3000
```

```bash
fly secrets set JWT_SECRET=my-super-secret-key-12345
```

```bash
fly secrets set SENDGRID_API_KEY=SG.xxxxx (replace with your actual key)
```

```bash
fly secrets set EMAIL_FROM=your-verified-email@domain.com
```

```bash
fly secrets set EMAIL_FROM_NAME="Safe School Bus Kashmir"
```

### 4.2 Optional Secrets (if you want these features)

```bash
fly secrets set GOOGLE_MAPS_BROWSER_KEY=your-key
```

```bash
fly secrets set GOOGLE_ROUTES_API_KEY=your-key
```

---

## PART 5: Deploy Your App (2 minutes)

1. **Deploy command**:
   ```bash
   fly deploy
   ```

2. **Watch the deployment**:
   - You'll see build logs
   - Build takes 2-3 minutes
   - Then it deploys

3. **Wait for completion**:
   - You'll see: "Deploying..."
   - Then: "Your app is live!"
   - URL will be shown

---

## PART 6: Test Your Live Site (1 minute)

1. **Open your Fly.io URL**:
   - Format: `https://safeschoolbus-kashmir.fly.dev`
   - Or your custom app name

2. **Test registration**:
   - Click "Create new account"
   - Enter details
   - Check email for verification code
   - Enter code and login!

---

## ✅ Done!

Your site is now **LIVE** on Fly.io!

---

## 📋 Complete Command List

Copy and paste these commands in order:

```bash
# 1. Navigate to project
cd "c:\Users\moham\OneDrive\Desktop\Hackathon\Bus Tracker"

# 2. Login to Fly.io
fly auth login

# 3. Launch app (first time only)
fly launch --no-deploy

# 4. Set secrets
fly secrets set NODE_ENV=production
fly secrets set PORT=3000
fly secrets set JWT_SECRET=my-super-secret-key-12345
fly secrets set SENDGRID_API_KEY=SG.xxxxx
fly secrets set EMAIL_FROM=your-email@domain.com
fly secrets set EMAIL_FROM_NAME="Safe School Bus Kashmir"

# 5. Deploy
fly deploy
```

---

## 🔧 Troubleshooting

### Issue: "fly command not found"
**Solution**: Restart PowerShell after installing Fly.io CLI

### Issue: "App name already taken"
**Solution**: Use a different app name when running `fly launch`

### Issue: "Build failed"
**Solution**: Check logs with `fly logs` command

### Issue: "Secrets not set"
**Solution**: Run `fly secrets list` to verify all secrets are set

### Issue: "Site not loading"
**Solution**: 
1. Check logs: `fly logs`
2. Verify secrets: `fly secrets list`
3. Check app status: `fly status`

---

## 📊 Useful Fly.io Commands

```bash
# View logs
fly logs

# Check app status
fly status

# List secrets
fly secrets list

# Update secrets
fly secrets set KEY=value

# Restart app
fly apps restart safeschoolbus-kashmir

# Open app in browser
fly open

# SSH into app
fly ssh console
```

---

## 🎯 Advantages of Fly.io

1. **Free Tier**: 3 shared VMs with 256MB RAM each
2. **No Credit Card Required**: For free tier
3. **Global Deployment**: Deploy to multiple regions
4. **Auto-scaling**: Scales based on traffic
5. **Persistent Storage**: Free 1GB volume storage

---

## 💡 Tips

1. **First deploy** takes 3-5 minutes
2. **Free tier** spins down after inactivity (first request wakes it up)
3. **Monitor logs**: Use `fly logs` to see real-time logs
4. **Custom domain**: Add via `fly certs add` command
5. **Database**: For production, add PostgreSQL with `fly postgres create`

---

## 🔐 Security Notes

1. **Never commit secrets** to Git
2. **Use strong JWT_SECRET** (random long string)
3. **Verify sender email** in SendGrid
4. **Monitor logs** for suspicious activity
5. **Backup database** regularly

---

## 🆘 Need Help?

1. **Check logs**: `fly logs`
2. **Check status**: `fly status`
3. **Fly.io Docs**: https://fly.io/docs
4. **GitHub Issues**: https://github.com/MohammadOmmar/Bus-Tracker/issues

---

## 🎊 Success!

Your Safe School Bus Kashmir system is now live on Fly.io!

**Your URL**: `https://safeschoolbus-kashmir.fly.dev`

**Share it**: Anyone can access your site from anywhere in the world!

---

## 📈 Scaling Up (Optional)

When you're ready for production:

1. **Add PostgreSQL**:
   ```bash
   fly postgres create
   fly postgres attach
   ```

2. **Add Redis** (for sessions):
   ```bash
   fly redis create
   ```

3. **Upgrade to paid plan**:
   - More RAM
   - More CPU
   - No spin-down
   - Custom domains

4. **Monitor performance**:
   - Fly.io dashboard
   - SendGrid analytics
   - Application logs