# Run, Human, Run! 🏃‍♂️

A standalone Pac-Man/Snake hybrid survival game built with Next.js and React.

<img width="789" alt="image" src="https://github.com/user-attachments/assets/3e4ccccf-b43d-4490-985d-e24b7ef5af12" />
<img width="721" alt="image" src="https://github.com/user-attachments/assets/3d74e3b7-cb55-49cf-9b60-9907c219341b" />


## 🎮 Game Description

Navigate through a maze as a human character, collecting UBI Credits while avoiding aggressive apes. Use power-ups to turn the tables and eat the apes instead!

## ✨ Features

- **Pac-Man/Snake Hybrid Gameplay**: Move around a maze with a growing trail
- **Smart AI Enemies**: Apes that actively pursue the player with intelligent pathfinding
- **Power-Up System**: Collect blue power-ups to temporarily eat enemies
- **Progressive Difficulty**: More apes spawn over time
- **Win Condition**: Collect 3 UBI Credits to win the game
- **Responsive Design**: Works on desktop and mobile devices

## 🎯 Game Controls

- **Arrow Keys**: Move your character
- **Space Bar**: Restart game (when game over or won)

## 📖 How to Play

1. Use arrow keys to move your character around the maze
2. Collect yellow UBI Credits (coins) to increase your score and trail length
3. Avoid brown apes - they will chase you and cost you a life if they catch you
4. Collect blue power-ups to enter "power mode" where you can eat apes for points
5. Collect 3 UBI Credits to win the game!

## 🚀 Quick Start

### Prerequisites

Make sure you have these installed:
- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

### Local Development Setup

1. **Clone or download this repository**
   ```bash
   git clone <your-repo-url>
   cd run-humans-run
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:3001](http://localhost:3001)
   
   🎉 **That's it! The game should now be running locally.**

### Production Build

To create an optimized production build:

```bash
# Build the application
npm run build

# Start the production server
npm start
```

The production server will also run on [http://localhost:3001](http://localhost:3001)

## 🛠️ Tech Stack

- **Next.js 14**: React framework with app router
- **TypeScript**: Type safety and better development experience
- **Tailwind CSS**: Utility-first CSS framework for styling
- **HTML5 Canvas**: High-performance game rendering

## ⚙️ Game Mechanics

- **Player Speed**: Moves every 6 frames
- **Ape Speed**: Moves every 10 frames (slightly slower than player)
- **Power Mode**: Lasts 10 seconds (300 frames at 30fps)
- **Ape Spawning**: New apes spawn every 10 seconds (max 8 apes)
- **Win Condition**: Collect 3 UBI Credits
- **Lives**: Start with 3 lives

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# If port 3001 is busy, you can use a different port:
npm run dev -- -p 3002
```

**Node.js version issues:**
```bash
# Check your Node.js version
node --version

# Should be 18.0.0 or higher
```

**Clear npm cache (if installation fails):**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contributing

This is a standalone extraction of a game originally embedded in an e-commerce application. 

**Want to contribute?**
- Fork the repository
- Create a feature branch
- Make your changes
- Submit a pull request

All contributions are welcome!

## 📄 License

MIT License - Use this code freely for personal or commercial projects. See [LICENSE](LICENSE) file for details.

## 🎊 Credits

Created as a fun, standalone version of the chaos monkey game. Enjoy playing and feel free to modify, extend, or use this code in your own projects!
