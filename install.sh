#!/bin/bash

# Installer script for e-commerce website - One command setup

echo "====================================="
echo "E-Commerce Website Installer"
echo "====================================="

# Check if user is root
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root" >&2
  exit 1
fi

# Update packages
echo "Updating system packages..."
apt update && apt upgrade -y

# Install dependencies
echo "Installing dependencies..."
apt install -y nginx git python3-pip python3-venv nodejs npm

# Clone the repository
echo "Cloning repository..."
git clone https://github.com/yourusername/ecommerce-website.git /var/www/ecommerce-website
cd /var/www/ecommerce-website

# Set up backend virtual environment
echo "Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Configure Nginx
echo "Configuring Nginx..."
cp nginx.conf /etc/nginx/sites-available/ecommerce-website
ln -sf /etc/nginx/sites-available/ecommerce-website /etc/nginx/sites-enabled/
nginx -t

# Restart Nginx
echo "Restarting Nginx..."
systemctl restart nginx

# Create systemd service for backend
echo "Creating backend service..."
cat > /etc/systemd/system/ecommerce-backend.service <<EOF
[Unit]
Description=E-commerce backend API
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/ecommerce-website/backend
Environment="PATH=/var/www/ecommerce-website/backend/venv/bin"
ExecStart=/var/www/ecommerce-website/backend/venv/bin/gunicorn -c /var/www/ecommerce-website/backend/gunicorn_config.py app.main:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
systemctl daemon-reload
systemctl start ecommerce-backend
systemctl enable ecommerce-backend

# Set permissions
echo "Setting permissions..."
chown -R www-data:www-data /var/www/ecommerce-website
chmod -R 755 /var/www/ecommerce-website

echo "====================================="
echo "Installation completed successfully!"
echo "====================================="
echo "Backend API is running on http://127.0.0.1:8000"
echo "Frontend is running on http://your_domain.com"
echo "====================================="