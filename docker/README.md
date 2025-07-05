# Docker Configuration Files

This directory contains configuration files for Docker deployment.

## Current Setup

The application is designed to connect to an **existing Traefik instance** running on your server. This means:

1. You don't need to run a separate Traefik instance for this application
2. The application will connect to your existing Traefik network
3. Traefik will handle routing, SSL certificates, and security

## Files

- `nginx.conf`: A basic Nginx configuration (not used in the current Traefik setup)
- `traefik.yml`: Traefik static configuration (for reference, not used with existing Traefik)
- `dynamic_conf.yml`: Traefik dynamic configuration (for reference, not used with existing Traefik)
- `traefik-compose.yml`: Docker Compose file for Traefik (for reference, not used with existing Traefik)

## Using These Files

These files are kept for reference and in case you need to set up Traefik on a different server. If you don't have Traefik running yet, you can use these files to set it up:

```bash
# Create the network
docker network create traefik-public

# Update your email in traefik.yml
# Edit docker/traefik.yml and replace "your-email@example.com" with your actual email

# Start Traefik
docker-compose -f docker/traefik-compose.yml up -d
```

However, the current deployment script assumes you already have Traefik running and will automatically connect to your existing Traefik network. 