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

# Check for existing Traefik network
echo "Checking for existing Traefik network..."
TRAEFIK_NETWORK=$(docker network ls --filter name=traefik --format "{{.Name}}" | head -n 1)

if [ -z "$TRAEFIK_NETWORK" ]; then
  echo "⚠️ No Traefik network found. Please enter the name of your existing Traefik network:"
  read NETWORK_NAME
  
  # Check if the provided network exists
  if ! docker network ls | grep -q "$NETWORK_NAME"; then
    echo "❌ Network '$NETWORK_NAME' does not exist. Please create it first."
    exit 1
  else
    # Update docker-compose.yml with the correct network name
    sed -i "s/traefik-public:/$NETWORK_NAME:/g" docker-compose.yml
    echo "✅ Docker Compose file updated with network name: $NETWORK_NAME"
  fi
else
  echo "✅ Found Traefik network: $TRAEFIK_NETWORK"
  
  # Update docker-compose.yml with the correct network name if it's not traefik-public
  if [ "$TRAEFIK_NETWORK" != "traefik-public" ]; then
    sed -i "s/traefik-public:/$TRAEFIK_NETWORK:/g" docker-compose.yml
    echo "✅ Docker Compose file updated with network name: $TRAEFIK_NETWORK"
  fi
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