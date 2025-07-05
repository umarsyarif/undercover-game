# Undercover Game

A digital implementation of the popular party game "Undercover" (similar to "Spyfall" or "Among Us" in concept).

## About the Game

Undercover is a social deduction game where players are given secret words. Most players receive the same word (Civilians), one or two get a slightly different word (Undercover), and optionally, one player gets no word at all (Mr. White).

Players take turns describing their word without revealing it directly. After each round, players vote on who they think is the Undercover or Mr. White.

For detailed game rules, see [Game Rules](docs/GAME_RULE.md).

## Features

- Player setup with customizable number of players, undercovers, and Mr. White
- Card selection interface
- Description phase with randomized player order
- Voting phase
- Game over screen with winner display
- Word management with local storage
- Responsive design for mobile and desktop

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest for testing

## Development

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd undercover-game
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your API endpoint:
```
VITE_WORD_API_ENDPOINT=https://your-api-endpoint.com/api/words
```

4. Start the development server:
```bash
npm run dev
```

### Testing

Run tests with:
```bash
npm test
```

## Deployment

This application can be deployed using Docker and Docker Compose with a custom subdomain. See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

### Quick Deployment with Subdomain

1. Make sure Docker and Docker Compose are installed
2. Set up Nginx Proxy and Let's Encrypt companion (see Deployment Guide)
3. Create a `.env` file with your API endpoint:
```
VITE_WORD_API_ENDPOINT=https://your-secure-api-endpoint.com/api/words
```
4. Run:
```bash
docker-compose up -d
```
5. Access the application at https://undercover.umarsyariif.site (or your configured subdomain)

### Environment Variables

| Variable | Description | Used At |
|----------|-------------|---------|
| VITE_WORD_API_ENDPOINT | URL to your word pairs API endpoint | Build time |

## Security

The API endpoint is injected at build time and not exposed in the runtime environment, providing better security for your backend services.

## License

[MIT License](LICENSE)
