# Undercover Game

A web-based implementation of the popular party game "Undercover" (similar to "Spyfall" or "Werewolf"), built with React, TypeScript, and Vite.

## Game Overview

In Undercover, players are assigned roles:
- **Civilians**: Most players receive the same word
- **Undercover**: A few players receive a similar but different word
- **Mr. White**: One player receives no word and must figure out what others are talking about

Players take turns describing their word without saying it directly. After each round, players vote on who they think is the Undercover or Mr. White. The game continues until all Undercovers and Mr. White are eliminated or until they outnumber the Civilians.

For detailed game rules, see [GAME_RULE.md](docs/GAME_RULE.md).

## Features

- Responsive design for mobile and desktop play
- Automatic word pair generation via API
- Custom word management
- Multiple game phases (setup, description, voting, game over)
- Real-time game state management
- Player elimination tracking
- Win condition detection for all roles

## Development

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/undercover-game.git
cd undercover-game

# Install dependencies
npm install
# or
yarn
```

### Environment Variables

Create a `.env` file in the root directory:

```
VITE_WORD_API_ENDPOINT=http://your-api-endpoint/api/words
```

### Running Locally

```bash
npm run dev
# or
yarn dev
```

This will start the development server at `http://localhost:5173`.

### Building for Production

```bash
npm run build
# or
yarn build
```

## Deployment

The application can be deployed using Docker and Docker Compose. It's designed to work with Traefik as a reverse proxy for automatic SSL and subdomain routing.

### With Existing Traefik

If you already have Traefik running on your server (managing other applications):

1. Simply run the deployment script:
   ```bash
   ./deploy.sh
   ```

2. The script will automatically detect your existing Traefik network and connect to it.

### Without Existing Traefik

If you don't have Traefik running yet:

1. Use the included Traefik configuration:
   ```bash
   # Create the network
   docker network create traefik-public
   
   # Start Traefik (after updating your email in docker/traefik.yml)
   docker-compose -f docker/traefik-compose.yml up -d
   
   # Deploy the application
   docker-compose up -d
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Architecture

The application follows a service-oriented architecture with:

- React components for UI
- Custom hooks for state management
- Service layer for game logic
- API integration for word generation

For architecture details and improvement plans, see [ARCHITECTURE_IMPROVEMENTS.md](docs/ARCHITECTURE_IMPROVEMENTS.md).

## Testing

```bash
npm run test
# or
yarn test
```

## License

[MIT](LICENSE)
