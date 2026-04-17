# Deployment Guide — Google Cloud Platform (Free Tier)

## Architecture

Everything runs on a **single free GCE e2-micro VM**. Nginx fronts all traffic:
- `yourdomain.com/api/*` → proxied to Node.js (port 3001)
- `yourdomain.com/*` → served from the built React static files

Since frontend and backend share the same domain, **CORS is not needed in production**.

```
[Browser] → [nginx :80] ─┬─ /api/* → [Node.js :3001] → [SQLite on persistent disk]
                          └─ /*    → [React dist/ files ]
                                              ↕
                                   [GCS Bucket - Images]
```

---

## What You Get Free (Always Free — Not a Trial)

| Resource | Spec |
|---|---|
| VM Type | e2-micro (2 vCPU burst, 1 GB RAM) |
| Persistent Disk | 30 GB standard |
| Region | `us-central1`, `us-east1`, or `us-west1` |
| Network egress | 1 GB/month to most destinations |

> [!IMPORTANT]
> You **must** select one of the three free regions above, and you **must** select the `e2-micro` machine type, or it will not be free.

---

## Prerequisites

- A Google account
- This project pushed to a GitHub repository (see below)
- GCP project created at [console.cloud.google.com](https://console.cloud.google.com)

---

## Step 1 — Push to GitHub

```bash
# In your project root
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/softchoice-guess-who.git
git push -u origin main
```

---

## Step 2 — Create the Free VM on GCP

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Navigate to **Compute Engine → VM Instances**
3. Click **"Create Instance"**
4. Configure as follows:

| Setting | Value |
|---|---|
| **Name** | `guess-who-vm` |
| **Region** | `us-central1` (or `us-east1` / `us-west1`) |
| **Zone** | any in that region |
| **Machine type** | `e2-micro` |
| **Boot disk OS** | `Ubuntu 22.04 LTS` |
| **Boot disk size** | `30 GB` (the free max) |
| **Firewall** | ✅ Allow HTTP traffic, ✅ Allow HTTPS traffic |

5. Click **"Create"**
6. Wait ~1 minute for the VM to start
7. Note the **External IP** shown in the VM list — this is your server's address

---

## Step 3 — SSH Into the VM

Click the **"SSH"** button in the GCP Console next to your VM. A browser terminal window will open.

All commands below are run inside that SSH terminal.

---

## Step 4 — Install Dependencies on the VM

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx (web server / reverse proxy)
sudo apt install -y nginx

# Install git
sudo apt install -y git

# Install PM2 (keeps your Node.js server running after terminal closes)
sudo npm install -g pm2

# Verify versions
node --version   # Should be v20.x
npm --version
nginx -v
pm2 --version
```

---

## Step 5 — Clone and Build the App

```bash
# Go to the web root directory
cd /var/www

# Clone your repo
sudo git clone https://github.com/YOUR_USERNAME/softchoice-guess-who.git guess-who
cd guess-who

# Take ownership so you don't need sudo for npm
sudo chown -R $USER:$USER /var/www/guess-who

# Install all dependencies
npm install

# Build the React frontend (creates apps/client/dist/)
npm run build -w apps/client
```

---

## Step 6 — Set Up Environment Variables for the Server

```bash
# Create the .env file for the server
cat > apps/server/.env << 'EOF'
PORT=3001
NODE_ENV=production
GCS_BUCKET_URL=https://storage.googleapis.com/cabana-oasis-assets-next26/
GCS_CACHE_TTL_SECONDS=300
DB_PATH=/var/www/guess-who/data/votes.db
EOF

# Create the data directory for SQLite
mkdir -p /var/www/guess-who/data
```

---

## Step 7 — Start the Node.js Server with PM2

```bash
cd /var/www/guess-who/apps/server

# Start the server with PM2
pm2 start src/index.js --name "guess-who-api"

# Save the PM2 process list so it auto-starts on reboot
pm2 save

# Set PM2 to run on system startup
pm2 startup
# ⚠️ Copy and run the command it outputs (it will look like: sudo env PATH=...)
```

Verify the server is running:
```bash
pm2 status          # Should show "online"
curl http://localhost:3001/api/health   # Should return {"status":"ok"}
```

---

## Step 8 — Configure nginx

```bash
# Create the nginx site config
sudo nano /etc/nginx/sites-available/guess-who
```

Paste the following configuration (replace `YOUR_VM_IP` with your VM's external IP):

```nginx
server {
    listen 80;
    server_name YOUR_VM_IP;   # Replace with your IP or domain name

    # --- API: proxy to Node.js ---
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # --- Frontend: serve React build ---
    location / {
        root /var/www/guess-who/apps/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;   # Required for React Router
    }
}
```

Save with `Ctrl+O`, `Enter`, then `Ctrl+X`.

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/guess-who /etc/nginx/sites-enabled/

# Remove the default nginx site
sudo rm /etc/nginx/sites-enabled/default

# Test the nginx config
sudo nginx -t   # Should say "syntax is ok"

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx   # Auto-start on reboot
```

---

## Step 9 — Open the App

Open your browser and navigate to:
```
http://YOUR_VM_EXTERNAL_IP
```

You should see the Guess Who gallery loading!

---

## Optional — Add a Free Custom Domain + HTTPS

If you have a domain name, you can get free HTTPS via Let's Encrypt:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get a free SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is set up automatically
```

Update the `server_name` in your nginx config from the IP to `yourdomain.com`.

---

## Redeploying After Code Changes

SSH back into the VM and run:

```bash
cd /var/www/guess-who

# Pull latest code
git pull

# Rebuild frontend if you changed frontend code
npm run build -w apps/client

# Restart the backend if you changed server code
pm2 restart guess-who-api
```

---

## Monitoring & Logs

```bash
pm2 logs guess-who-api       # Live server logs
pm2 logs guess-who-api --lines 100  # Last 100 lines
pm2 monit                    # Live CPU/Memory dashboard
sudo tail -f /var/log/nginx/error.log  # nginx errors
```

---

## Database Management (from the VM)

```bash
cd /var/www/guess-who/apps/server

npm run db:view    # See recent votes
npm run db:clear   # Clear all votes (SQLite file stays on disk)
```

The SQLite file lives at `/var/www/guess-who/data/votes.db` on the **persistent disk** — it will survive reboots and redeployments indefinitely.
