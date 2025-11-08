# Railway Deployment Guide

## 🚂 Railway Setup Instructions

### Step 1: Connect Repository
1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `frontunafronend/liveIDEConnect`
5. Railway will automatically detect the Dockerfile in `fullstack/BE/`

### Step 2: Configure Build Settings
Railway should auto-detect:
- **Root Directory**: `fullstack/BE`
- **Dockerfile Path**: `Dockerfile` (in `fullstack/BE/`)
- **Start Command**: `npm start`

If not auto-detected, set:
- **Root Directory**: `fullstack/BE`
- **Build Command**: (leave empty, Dockerfile handles it)
- **Start Command**: `npm start`

### Step 3: Set Environment Variables

Go to your Railway project → Variables tab and add:

#### Required Variables

```env
# Server Configuration
PORT=4000
HOST=0.0.0.0
NODE_ENV=production

# Database (from Neon)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# Optional: OpenAI for AI Guard v2 summaries
OPENAI_API_KEY=sk-... (optional, only if you want AI summaries)
```

#### How to Get DATABASE_URL from Neon

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to **Connection Details**
4. Copy the connection string
5. It looks like: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`
6. Paste it as `DATABASE_URL` in Railway

#### Generate JWT_SECRET

Use a strong random string (minimum 32 characters):

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```

### Step 4: Deploy

1. Railway will automatically deploy when you push to `main` branch
2. Or click "Deploy" button in Railway dashboard
3. Wait for build to complete (usually 2-5 minutes)

### Step 5: Get Your Backend URL

1. Go to Railway project → Settings → Networking
2. Railway will assign a domain like: `your-app-name.up.railway.app`
3. Copy this URL - this is your backend API URL

### Step 6: Update Frontend Environment

Update your frontend environment files with the Railway URL:

**For Vercel/Production:**
```env
API_BASE_URL=https://your-app-name.up.railway.app/api
WS_URL=wss://your-app-name.up.railway.app/ws
```

**For Local Development:**
Update `fullstack/FE/src/environments/environment.ts`:
```typescript
export const env = {
  production: false,
  apiBaseUrl: 'https://your-app-name.up.railway.app/api',
  wsUrl: 'wss://your-app-name.up.railway.app/ws'
};
```

### Step 7: Verify Deployment

1. Check Railway logs for successful startup
2. Visit: `https://your-app-name.up.railway.app/health`
3. Should return: `{"status":"ok","database":"connected","timestamp":"..."}`

### Step 8: Database Migrations

Migrations run automatically on startup via `initDatabase()` in `src/index.ts`.

If you need to run migrations manually:
1. Go to Railway project → Deployments
2. Click on latest deployment → View Logs
3. Or use Railway CLI:
```bash
railway run npm run db:migrate
```

## 🔧 Railway-Specific Configuration

### Custom Domain (Optional)

1. Go to Railway project → Settings → Networking
2. Click "Generate Domain" or add custom domain
3. Railway provides free SSL certificates automatically

### Environment Variables Priority

Railway environment variables override:
1. Railway Variables (highest priority)
2. `.env` file (if present)
3. Default values in code

### Monitoring & Logs

- **Logs**: Railway Dashboard → Deployments → View Logs
- **Metrics**: Railway Dashboard → Metrics tab
- **Health Checks**: Railway automatically monitors `/health` endpoint

### Scaling (Pro Plan)

With $5/month subscription, you get:
- **512MB RAM** (default)
- **1 vCPU**
- **$5 credit/month** for usage

To scale:
1. Go to Railway project → Settings → Resources
2. Adjust CPU/RAM as needed
3. Monitor usage in Metrics tab

## 🐛 Troubleshooting

### Build Fails

**Error: "Cannot find module"**
- Ensure `package.json` includes all dependencies
- Check that `npm ci` runs successfully

**Error: "TypeScript compilation failed"**
- Check TypeScript errors: `npm run build` locally
- Ensure all type errors are fixed

### Runtime Errors

**Error: "DATABASE_URL not set"**
- Verify environment variable is set in Railway
- Check variable name spelling (case-sensitive)

**Error: "JWT_SECRET not set"**
- Add `JWT_SECRET` environment variable
- Use a strong random string (32+ characters)

**Error: "Database connection failed"**
- Verify `DATABASE_URL` is correct
- Check Neon database is running
- Ensure SSL mode is set: `?sslmode=require`

### Health Check Fails

**Error: "Health check failed"**
- Check Railway logs for errors
- Verify `/health` endpoint is accessible
- Ensure database connection is working

## 📊 Monitoring

### Railway Metrics

Railway provides:
- **CPU Usage**: Real-time CPU monitoring
- **Memory Usage**: RAM consumption
- **Network**: Request/response metrics
- **Logs**: Real-time application logs

### AI Guard v2 Integration

Your AI Guard v2 system monitor will track:
- Railway server CPU/memory (via Node.js os module)
- Database latency (Neon Postgres)
- Active connections and sessions
- All metrics stored in `monitor_metrics` table

## 🔄 Continuous Deployment

Railway automatically deploys on:
- Push to `main` branch
- Manual deploy from dashboard
- Railway CLI: `railway up`

## 📝 Next Steps

1. ✅ Set all environment variables
2. ✅ Deploy backend to Railway
3. ✅ Get Railway backend URL
4. ✅ Deploy frontend to Vercel (update with Railway URL)
5. ✅ Test full-stack application
6. ✅ Monitor via AI Guard v2 dashboard

## 🆘 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Project Issues**: https://github.com/frontunafronend/liveIDEConnect/issues

