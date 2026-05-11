board-game-project/
├── backend/                # Node.js + Express
│   ├── src/
│   │   ├── controllers/    # Game logic (move validation, win conditions)
│   │   ├── models/         # Database schemas (Players, Game State)
│   │   ├── routes/         # API Paths (/api/play, /api/auth)
│   │   └── server.js       # Main entry point
│   └── package.json
├── frontend/               # Vite + React
│   ├── public/             # Icons, manifest, robots.txt
│   ├── src/
│   │   ├── assets/         # Board textures, game piece images
│   │   ├── components/     # UI pieces (Square, Piece, ScoreBoard)
│   │   ├── hooks/          # Custom logic (useBoardState, useSocket)
│   │   ├── pages/          # Home, GameBoard, Profile
│   │   ├── services/       # API calls (axios/fetch helper functions)
│   │   ├── App.jsx         # Routing and Global Providers
│   │   └── main.jsx        # Entry point (Vite default)
│   ├── index.html          # Vite root HTML
│   ├── package.json
│   └── vite.config.js      # Vite configuration
└── .gitignore              # Ignore node_modules & .env
backend test