# Deployment Guide for Undercover Game

This guide explains how to deploy the Undercover Game application using Docker and Docker Compose with a custom subdomain using an existing Traefik instance.

## Prerequisites

- Docker
- Docker Compose
- Existing Traefik instance running on your server
- Domain name pointing to your server

## Environment Variables

The application requires the following environment variable:

- `VITE_WORD_API_ENDPOINT`: URL to your word pairs API endpoint

For security, this variable is passed as a build argument and not exposed in the runtime environment.

## Deployment with Existing Traefik

This setup assumes you already have [Traefik](https://traefik.io/) running on your server and handling other applications.

### 1. Find Your Traefik Network

First, you need to identify which Docker network your Traefik instance is using:

```bash
docker network ls
```

Look for a network that contains "traefik" in its name, or the network you know your Traefik is connected to.

### 2. Create a `.env` file with your API endpoint

Create a `.env` file in the root directory of your project:

```
VITE_WORD_API_ENDPOINT=https://your-secure-api-endpoint.com/api/words
```

This environment variable will be used during the build process but won't be exposed in the final container.

### 3. Deploy the Undercover Game

The deployment script will automatically detect your Traefik network and connect to it:

```bash
./deploy.sh
```

If the script cannot find your Traefik network automatically, it will prompt you to enter the network name.

The application will be available at `https://undercover.umarsyariif.site` once DNS propagation is complete.

## Manual Deployment

If you prefer to deploy manually:

1. Update the `docker-compose.yml` file to use your Traefik network:
```yaml
networks:
  traefik-public:  # Replace with your Traefik network name
    external: true
```

2. Deploy the application:
```bash
docker-compose up -d
```

## DNS Configuration

Ensure your DNS settings include an A record for `undercover.umarsyariif.site` pointing to your server's IP address.

## Traefik Configuration

Your existing Traefik instance should already be configured for:

1. Automatic SSL certificate generation via Let's Encrypt
2. HTTP to HTTPS redirection
3. Proper routing based on hostnames

If you need to make any Traefik-specific adjustments, you can modify the labels in the `docker-compose.yml` file:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.undercover.rule=Host(`undercover.umarsyariif.site`)"
  - "traefik.http.routers.undercover.entrypoints=websecure"
  - "traefik.http.routers.undercover.tls.certresolver=letsencrypt"
  - "traefik.http.services.undercover.loadbalancer.server.port=80"
```

Make sure these labels match your Traefik configuration, especially:
- The `entrypoints` value should match your secure entrypoint name
- The `certresolver` value should match your certificate resolver name

## Security Considerations

### API Endpoint Security

The API endpoint is injected at build time and not exposed in the runtime environment. This means:

1. The endpoint URL is not visible in the browser's network requests
2. It's not accessible in the client-side JavaScript
3. It's compiled into the application bundle

For additional security:

- Implement API key authentication
- Set up CORS restrictions on your API server
- Consider rate limiting to prevent abuse

## Troubleshooting

### Application Issues

```bash
# Check the logs of the Undercover Game container
docker logs undercover-game
```

### Traefik Routing Issues

```bash
# Check the logs of your Traefik container
docker logs <your-traefik-container-name>
```

## Updating the Application

To update the application:

1. Pull the latest changes:
```bash
git pull
```

2. Rebuild with the latest environment variables:
```bash
docker-compose down
docker-compose up -d --build
``` 