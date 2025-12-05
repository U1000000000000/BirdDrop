# 🚀 BirdDrop Deployment Guide

## ✅ Phase 1 Complete: Code Prepared for Production

### Changes Made:
1. ✅ Added CORS support to backend
2. ✅ Added environment variable configuration
3. ✅ Created centralized WebSocket URL utility
4. ✅ Updated all components to use production-ready URLs
5. ✅ Added health check endpoint (`/health`)
6. ✅ Created `.env.example` files
7. ✅ Added `.gitignore` files
8. ✅ Added npm scripts for production

---

## 📋 Ready for Phase 2: Backend Deployment

### Option A: Railway (Recommended - Free $5/month credit)

**Steps:**
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your BirdDrop repository
5. Select the `backend` folder as root directory
6. Add environment variable:
   - `ALLOWED_ORIGINS` = `*` (temporarily, we'll fix after frontend deploy)
7. Railway will auto-detect Node.js and deploy
8. Copy the provided URL (e.g., `birddrop-backend.up.railway.app`)

### Option B: Render.com (Free tier, slower cold starts)

**Steps:**
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your repository
5. Configure:
   - Name: `birddrop-backend`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Add `ALLOWED_ORIGINS=*`
6. Click "Create Web Service"
7. Copy the URL

---

## 📋 Phase 3: Frontend Deployment

### Vercel (Recommended - Free, Fast)

**Steps:**
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Add New" → "Project"
4. Import your BirdDrop repository
5. Configure:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add Environment Variable:
   - `VITE_WS_URL` = `wss://your-backend-url.railway.app` (replace with your Railway URL)
7. Click "Deploy"
8. Get your URL (e.g., `birddrop.vercel.app`)

### Update Backend CORS:
- Go back to Railway
- Update `ALLOWED_ORIGINS` to your Vercel URL:
  ```
  https://birddrop.vercel.app,https://www.birddrop.vercel.app
  ```
- Redeploy backend

---

## 📋 Phase 4: Android APK Release

### Build Release APK:
1. Update backend URL in MainActivity.kt (line ~50):
   ```kotlin
   private val SERVER_URL = "https://birddrop.vercel.app"
   ```

2. Build release APK:
   ```bash
   cd /Users/ujjvalagarwal/AndroidStudioProjects/BirdDrop
   ./gradlew assembleRelease
   ```

3. APK location: `app/build/outputs/apk/release/app-release-unsigned.apk`

### Upload to GitHub:
1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Tag: `v1.0.0`
4. Title: `BirdDrop v1.0.0 - Initial Release`
5. Attach the APK file
6. Publish release

---

## 🧪 Testing Production Build Locally

### Backend:
```bash
cd backend
cp .env.example .env
npm start
```

### Frontend:
```bash
cd frontend
npm run build
npm run preview
```

Test at: http://localhost:4173

---

## ✅ Deployment Checklist

Before deploying:
- [ ] Push all changes to GitHub
- [ ] Create `.env` files (don't commit them!)
- [ ] Test build locally
- [ ] Have Railway/Vercel accounts ready

After deploying:
- [ ] Test WebSocket connection
- [ ] Test file sharing
- [ ] Test QR/NFC/Geo pairing
- [ ] Test on mobile device
- [ ] Update README with live URLs

---

## 🆘 Troubleshooting

**WebSocket connection fails:**
- Check ALLOWED_ORIGINS includes your frontend URL
- Verify VITE_WS_URL is correct (use `wss://` not `ws://`)
- Check Railway/Render logs for errors

**CORS errors:**
- Update ALLOWED_ORIGINS in backend env vars
- Make sure protocol matches (https/wss)

**Build fails:**
- Check Node.js version (needs >=18)
- Run `npm install` again
- Check for TypeScript/dependency errors

---

## 🎯 Next Steps

**Ready to deploy?** Start with Phase 2 (Backend) first, then Phase 3 (Frontend).

**Questions?** Check the logs in Railway/Vercel dashboard.
