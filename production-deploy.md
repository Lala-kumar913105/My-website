# Production Deployment & Optimization Guide

## 1) Docker + Compose (VPS / self-hosted)

### Prerequisites
- Ubuntu 22.04+ or similar
- Docker + Docker Compose installed
- Domain pointing to server IP

### Steps
```bash
cp .env.production.example .env
docker compose build
docker compose up -d
```

### Notes
- `nginx.conf` proxies to `frontend` + `backend` containers.
- Update `server_name` in `nginx.conf` to your domain.
- Replace `SECRET_KEY` in `.env`.

---

## 2) Nginx + HTTPS

### Recommended (Let’s Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 3) Production Build

### Frontend
```bash
cd frontend
npm install
npm run build
npm run start
```

### Backend
```bash
cd backend
pip install -r requirements.txt
gunicorn -c gunicorn_config.py app.main:app
```

---

## 4) Performance Notes
- Next.js production build enabled in Docker.
- Static assets cached by Nginx for 30 days.
- Service worker handles offline caching.

---

## 5) Security Notes
- Update `SECRET_KEY` and `ALLOWED_ORIGINS`.
- Nginx adds basic security headers.
- Enable HTTPS via Certbot.

---

## 6) Platforms (Render/Railway/Vercel)

### Frontend (Vercel)
- Import `frontend/` repo.
- Build: `npm run build`.
- Output: `.next`.
- Set `NEXT_PUBLIC_API_URL`.

### Backend (Render/Railway)
- Use Dockerfile in `backend/`.
- Set envs: `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`.

---

## 7) PWA Checklist
- Visit site on mobile.
- Use browser menu → “Add to Home Screen”.
- Go offline → `/offline` should render.
- Enable notifications from the prompt.