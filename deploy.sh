#!/bin/bash

# Undercover Game Deployment Script
echo "🎮 Undercover Game Deployment Script"
echo "-----------------------------------"

# Check if .env file exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Creating one..."
  echo "Please enter your API endpoint URL:"
  read API_ENDPOINT
  echo "VITE_WORD_API_ENDPOINT=$API_ENDPOINT" > .env
  echo "✅ .env file created."
else
  echo "✅ .env file found."
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed. Please install Docker first."
  exit 1
else
  echo "✅ Docker is installed."
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose is not installed. Please install Docker Compose first."
  exit 1
else
  echo "✅ Docker Compose is installed."
fi

# Check if nginx-proxy network exists
if ! docker network ls | grep -q nginx-proxy; then
  echo "❓ nginx-proxy network not found. Do you want to create it? (y/n)"
  read CREATE_NETWORK
  if [ "$CREATE_NETWORK" = "y" ]; then
    echo "Creating nginx-proxy network..."
    docker network create nginx-proxy
    echo "✅ nginx-proxy network created."
  else
    echo "⚠️ nginx-proxy network is required for subdomain routing."
    echo "Please create it manually or use a different network configuration."
  fi
else
  echo "✅ nginx-proxy network found."
fi

# Check if nginx-proxy container is running
if ! docker ps | grep -q nginx-proxy; then
  echo "⚠️ nginx-proxy container not found or not running."
  echo "❓ Do you want to set up nginx-proxy and Let's Encrypt companion? (y/n)"
  read SETUP_PROXY
  if [ "$SETUP_PROXY" = "y" ]; then
    echo "Setting up nginx-proxy..."
    docker run -d -p 80:80 -p 443:443 \
      --name nginx-proxy \
      --net nginx-proxy \
      -v /var/run/docker.sock:/tmp/docker.sock:ro \
      -v certs:/etc/nginx/certs \
      -v vhost:/etc/nginx/vhost.d \
      -v html:/usr/share/nginx/html \
      jwilder/nginx-proxy
    
    echo "Setting up Let's Encrypt companion..."
    echo "Please enter your email address for Let's Encrypt:"
    read EMAIL
    docker run -d \
      --name nginx-letsencrypt \
      --net nginx-proxy \
      --volumes-from nginx-proxy \
      -v /var/run/docker.sock:/var/run/docker.sock:ro \
      -v acme:/etc/acme.sh \
      -e DEFAULT_EMAIL=$EMAIL \
      jrcs/letsencrypt-nginx-proxy-companion
    
    echo "✅ nginx-proxy and Let's Encrypt companion set up."
  else
    echo "⚠️ You'll need to set up nginx-proxy manually for subdomain routing."
  fi
else
  echo "✅ nginx-proxy container is running."
fi

# Deploy the application
echo "🚀 Deploying Undercover Game..."
docker-compose down
docker-compose up -d --build

echo "✅ Deployment complete!"
echo "🌐 Your application will be available at https://undercover.umarsyariif.site"
echo "   (once DNS propagation is complete)"
echo ""
echo "📝 Check the logs with: docker-compose logs -f" 