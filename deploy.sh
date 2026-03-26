#!/bin/bash

# Deployment script for e-commerce website

# Update packages
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y nginx git python3-pip python3-venv

# Clone the repository
git clone https://github.com/yourusername/ecommerce-website.git
cd ecommerce-website

# Set up backend virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/ecommerce-website
sudo ln -sf /etc/nginx/sites-available/ecommerce-website /etc/nginx/sites-enabled/
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Start backend with Gunicorn
cd backend
source venv/bin/activate
gunicorn -c gunicorn_config.py app.main:app &

echo "Deployment completed successfully!"