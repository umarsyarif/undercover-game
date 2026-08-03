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

- Node.js (v22+; required by the pinned Wrangler version)
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

No environment variables are needed for local UI work.

To exercise the AI word generation locally, create a `.dev.vars` file (gitignored):

```
AI_BASE_URL=https://9router.umeh.me/v1
AI_API_KEY=...
AI_MODEL=...
```

then run `npm run dev` and `npm run dev:pages` in separate terminals and open
http://localhost:8788.

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

Cloudflare Pages. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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
