# Deployment Guide for Undercover Game

This guide explains how to deploy the Undercover Game application using Docker and Docker Compose with a custom subdomain.

## Prerequisites

- Docker
- Docker Compose
- Nginx Proxy (for subdomain routing)
- Let's Encrypt companion (for SSL)
- Domain name pointing to your server

## Environment Variables

The application requires the following environment variable:

- `VITE_WORD_API_ENDPOINT`: URL to your word pairs API endpoint

For security, this variable is passed as a build argument and not exposed in the runtime environment.

## Deployment with Nginx Proxy Manager

This setup assumes you're using [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) with [letsencrypt-nginx-proxy-companion](https://github.com/nginx-proxy/docker-letsencrypt-nginx-proxy-companion) for automatic SSL and subdomain routing.

### 1. Set up Nginx Proxy (if not already running)

```bash
# Create a network for your proxy
docker network create nginx-proxy

# Run the nginx-proxy container
docker run -d -p 80:80 -p 443:443 \
  --name nginx-proxy \
  --net nginx-proxy \
  -v /var/run/docker.sock:/tmp/docker.sock:ro \
  -v certs:/etc/nginx/certs \
  -v vhost:/etc/nginx/vhost.d \
  -v html:/usr/share/nginx/html \
  jwilder/nginx-proxy

# Run the Let's Encrypt companion
docker run -d \
  --name nginx-letsencrypt \
  --net nginx-proxy \
  --volumes-from nginx-proxy \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v acme:/etc/acme.sh \
  -e DEFAULT_EMAIL=your-email@example.com \
  jrcs/letsencrypt-nginx-proxy-companion
```

### 2. Create a `.env` file with your API endpoint

Create a `.env` file in the root directory of your project:

```
VITE_WORD_API_ENDPOINT=https://your-secure-api-endpoint.com/api/words
```

This environment variable will be used during the build process but won't be exposed in the final container.

### 3. Deploy the Undercover Game

```bash
docker-compose up -d
```

The application will be available at `https://undercover.umarsyariif.site` once DNS propagation is complete.

## DNS Configuration

Ensure your DNS settings include an A record or CNAME record for `undercover.umarsyariif.site` pointing to your server's IP address.

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

### SSL Configuration

The Let's Encrypt companion automatically manages SSL certificates for your subdomain. Ensure that:

- Your domain has proper DNS records
- Ports 80 and 443 are open on your server
- Your email address is correctly set in the Let's Encrypt container

## Troubleshooting

### Certificate Issues

If SSL certificates aren't being generated:

```bash
# Check the logs of the Let's Encrypt container
docker logs nginx-letsencrypt
```

### Nginx Proxy Issues

```bash
# Check the logs of the Nginx proxy
docker logs nginx-proxy
```

### Application Issues

```bash
# Check the logs of the Undercover Game container
docker logs undercover-game
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