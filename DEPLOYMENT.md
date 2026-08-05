# 🚀 SAFE SOLUTIONS OPS — Free Cloud Deployment Guide

This guide walks you through deploying the complete **SAFE SOLUTIONS OPS Employee Attendance System** using **100% FREE** services without requiring any credit card.

---

## 🎯 Selected Free Deployment Stack

| Layer | Provider | Free Tier Benefits |
| :--- | :--- | :--- |
| **Database** | **Neon PostgreSQL** ([neon.tech](https://neon.tech)) | Free 0.5 GiB Postgres Database, SSL enabled, connection string support |
| **Backend API** | **Render** ([render.com](https://render.com)) or **Koyeb** ([koyeb.com](https://koyeb.com)) | Free Web Service for Node.js APIs |
| **Frontend Web App**| **Netlify** ([netlify.com](https://netlify.com)) or **Vercel** ([vercel.com](https://vercel.com)) | Free global CDN static hosting, HTTPS included |

---

## 📌 STEP 1: Deploy Database (Neon PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and sign up for a free account.
2. Click **Create Project** and set:
   - Project Name: `safe-solutions-ops`
   - Database Name: `safe_solutions_ops`
3. Once created, copy the **Connection String** (e.g. `postgres://user:password@ep-xyz.neon.tech/safe_solutions_ops?sslmode=require`).
4. Go to **SQL Editor** tab in Neon console, paste the contents of [`backend/sql/schema.sql`](file:///d:/safesolutionsOPS/backend/sql/schema.sql), and click **Run**.

---

## 📌 STEP 2: Deploy Backend API (Render)

1. Push this project repository to your GitHub account.
2. Sign in to [render.com](https://render.com) using your GitHub account.
3. Click **New +** -> **Web Service**.
4. Select your GitHub repository.
5. Configure the web service:
   - **Name**: `safe-solutions-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Under **Environment Variables**, add the following keys:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `<Your Neon PostgreSQL Connection String>`
   - `JWT_SECRET` = `<Any random 32+ character string>`
   - `JWT_REFRESH_SECRET` = `<Any random 32+ character string>`
   - `ALLOW_ALL_CORS` = `true`
7. Click **Create Web Service**.
8. Once built, copy your backend URL (e.g., `https://safe-solutions-backend.onrender.com`).

---

## 📌 STEP 3: Run Database Seed (Initial Admin Accounts & Office QR)

To seed initial employee data and generate the permanent office QR code:
From your local terminal or a one-time script with your Neon `DATABASE_URL`:
```bash
cd backend
DATABASE_URL="postgres://user:password@ep-xyz.neon.tech/safe_solutions_ops?sslmode=require" npm run seed
```

---

## 📌 STEP 4: Deploy Frontend (Netlify or Vercel)

### Option A: Netlify (Recommended)
1. Go to [netlify.com](https://netlify.com) and log in.
2. Click **Add new site** -> **Import an existing project**.
3. Connect your GitHub repository.
4. Set Build Settings:
   - **Publish directory**: `.` (Root directory)
5. Under **Environment variables**, set:
   - `ENV_API_BASE` = `https://safe-solutions-backend.onrender.com/api`
6. Click **Deploy Site**.

### Option B: Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Keep framework preset as **Other**.
5. Click **Deploy**.

---

## ✅ STEP 5: Verification Checklist

Once deployed, open your live HTTPS frontend URL and test:

- ✔️ **Login**: Sign in using `admin` / `Safe@123`.
- ✔️ **Office Attendance**: Click **Scan Office QR**, grant camera permission, scan the office QR code.
- ✔️ **Site Attendance**: Select a project site, take a front-camera selfie, upload site photo, enter meter reading, and submit.
- ✔️ **Reports**: Go to Reports tab, click **Export PDF** and **Export Excel** to verify download streams.
- ✔️ **Employee Management**: Add/Edit employee photos and records.
