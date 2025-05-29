"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface GameProps {
  gameStarted?: boolean;
  setGameStarted?: (value: boolean) => void;
  score?: number;
  setScore?: (value: number | ((prev: number) => number)) => void;
  lives?: number;
  setLives?: (value: number) => void;
  gameOver?: boolean;
  setGameOver?: (value: boolean) => void;
  gameWon?: boolean;
  setGameWon?: (value: boolean) => void;
  tokensCollected?: number;
  setTokensCollected?: (value: number | ((prev: number) => number)) => void;
  onGameComplete?: (success: boolean) => void;
}

export default function RunHumansRun({
  gameStarted: externalGameStarted,
  setGameStarted: externalSetGameStarted,
  score: externalScore,
  setScore: externalSetScore,
  lives: externalLives,
  setLives: externalSetLives,
  gameOver: externalGameOver,
  setGameOver: externalSetGameOver,
  gameWon: externalGameWon,
  setGameWon: externalSetGameWon,
  tokensCollected: externalTokensCollected,
  setTokensCollected: externalSetTokensCollected,
  onGameComplete,
}: GameProps = {}) {
  // Use external state if provided, otherwise use internal state
  const [internalGameStarted, internalSetGameStarted] = useState(false);
  const [internalScore, internalSetScore] = useState(0);
  const [internalLives, internalSetLives] = useState(3);
  const [internalGameOver, internalSetGameOver] = useState(false);
  const [internalGameWon, internalSetGameWon] = useState(false);
  const [internalTokensCollected, internalSetTokensCollected] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [powerModeState, setPowerModeState] = useState(false);
  const [powerModeTimerState, setPowerModeTimerState] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Use the provided state handlers or fallback to internal ones
  const gameStarted = externalGameStarted !== undefined ? externalGameStarted : internalGameStarted;
  const setGameStarted = externalSetGameStarted || internalSetGameStarted;
  const score = externalScore !== undefined ? externalScore : internalScore;
  const setScore = externalSetScore || internalSetScore;
  const lives = externalLives !== undefined ? externalLives : internalLives;
  const setLives = externalSetLives || internalSetLives;
  const gameOver = externalGameOver !== undefined ? externalGameOver : internalGameOver;
  const setGameOver = externalSetGameOver || internalSetGameOver;
  const gameWon = externalGameWon !== undefined ? externalGameWon : internalGameWon;
  const setGameWon = externalSetGameWon || internalSetGameWon;
  const tokensCollected = externalTokensCollected !== undefined ? externalTokensCollected : internalTokensCollected;
  const setTokensCollected = externalSetTokensCollected || internalSetTokensCollected;

  // Refs for tracking values that need to be accessed in event listeners
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const livesRef = useRef(3);
  const tokensCollectedRef = useRef(0);
  const gameOverRef = useRef(false);
  const gameWonRef = useRef(false);

  useEffect(() => {
    if (!gameStarted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Game constants
    const GRID_SIZE = 20;
    const GRID_WIDTH = Math.floor(canvas.width / GRID_SIZE);
    const GRID_HEIGHT = Math.floor(canvas.height / GRID_SIZE);
    const PLAYER_SPEED = 6; // Player moves every 6 frames (lower = faster)
    const APE_SPEED = 10; // Apes move every 10 frames (lower = faster)
    // Set tokens needed to win to 3 for standalone game
    const TOKENS_TO_WIN = 3;
    let frameCounter = 0;

    // Game state
    let player = {
      x: Math.floor(GRID_WIDTH / 2),
      y: Math.floor(GRID_HEIGHT / 2),
      trail: [] as Array<{ x: number; y: number }>,
      tailLength: 5,
      direction: { x: 0, y: 0 },
    };
    let tokens: Array<{ x: number; y: number }> = [];
    let powerUps: Array<{ x: number; y: number; active: boolean }> = [];
    let apes: Array<{
      x: number;
      y: number;
      direction: { x: number; y: number };
    }> = [];
    // let powerMode = false; // Replaced by powerModeState
    // let powerModeTimer = 0; // Replaced by powerModeTimerState
    let gameLoopId: number;
    const apeIntervalIdRef = useRef<number | undefined>(undefined); // Use const for ref
    const intendedDirectionRef = useRef<{ x: number; y: number } | null>(null);

    // Sound effects helper
    const playSound = (type: 'token' | 'lifeLost' | 'eatApe' | 'gameStart') => {
      if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
        // Attempt to resume/create context if needed, though primary resume is on game start click
        if (!audioContextRef.current) {
          try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
            return;
          }
        }
        audioContextRef.current.resume().catch(e => console.error("AudioContext resume failed", e));
      }
      if (!audioContextRef.current || audioContextRef.current.state !== 'running') {
        console.warn("AudioContext not running, cannot play sound.");
        return;
      }

      const audioCtx = audioContextRef.current;
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
      oscillator.connect(gainNode);

      const now = audioCtx.currentTime;

      switch (type) {
        case 'token':
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(880, now); // A5 note
          gainNode.gain.setValueAtTime(0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          break;
        case 'lifeLost':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(330, now); // E4
          oscillator.frequency.exponentialRampToValueAtTime(110, now + 0.5); // E3
          gainNode.gain.setValueAtTime(0.4, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          oscillator.start(now);
          oscillator.stop(now + 0.5);
          break;
        case 'eatApe':
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(440, now); // A4
          gainNode.gain.setValueAtTime(0.35, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;
        case 'gameStart':
          // A short ascending melody: C5, E5, G5
          const startTime = now;
          const noteDuration = 0.1;
          const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
          gainNode.gain.setValueAtTime(0.25, startTime);

          freqs.forEach((freq, i) => {
            const noteStartTime = startTime + i * noteDuration;
            oscillator.frequency.setValueAtTime(freq, noteStartTime);
            if (i === freqs.length -1) { // Last note
                 gainNode.gain.setValueAtTime(0.25, noteStartTime);
                 gainNode.gain.exponentialRampToValueAtTime(0.001, noteStartTime + noteDuration * 2);
            }
          });
          oscillator.type = 'triangle';
          oscillator.start(startTime);
          oscillator.stop(startTime + freqs.length * noteDuration + noteDuration);
          break;
      }
    };


    // Maze layout (1 = wall, 0 = path)
    const maze: number[][] = Array(GRID_HEIGHT)
      .fill(0)
      .map(() => Array(GRID_WIDTH).fill(0));

    // Create simple maze with walls
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        // Border walls
        if (
          x === 0 ||
          y === 0 ||
          x === GRID_WIDTH - 1 ||
          y === GRID_HEIGHT - 1
        ) {
          maze[y][x] = 1;
        }
        // Some internal walls - make sure we don't exceed array bounds
        else if (
          (x === 10 && y < 15 && y > 5) ||
          (y === 10 && x < 15 && x > 5 && x !== 10) ||
          (x === 30 && y > 5 && y < Math.min(35, GRID_HEIGHT - 1)) ||
          (y === 30 && x > 5 && x < Math.min(35, GRID_WIDTH - 1) && x !== 30)
        ) {
          // Make sure we're within bounds
          if (y < GRID_HEIGHT && x < GRID_WIDTH) {
            maze[y][x] = 1;
          }
        }
      }
    }

    // Initialize game
    const initGame = () => {
      try {
        console.log("Initializing game - player position reset");
        // Place player
        player = {
          x: Math.floor(GRID_WIDTH / 2),
          y: Math.floor(GRID_HEIGHT / 2),
          trail: [],
          tailLength: 5,
          direction: { x: 0, y: 0 }, // Ensure this is always defined
        };

        // Place tokens
        tokens = [];
        for (let i = 0; i < 10; i++) {
          placeToken();
        }

        // Place power-ups
        powerUps = [];
        for (let i = 0; i < 3; i++) {
          placePowerUp();
        }

        // Place apes
        apes = [];
        for (let i = 0; i < 4; i++) {
          spawnApeInCorner();
        }

        setPowerModeState(false);
        setPowerModeTimerState(0);
        setTokensCollected(0);
        tokensCollectedRef.current = 0;
        gameOverRef.current = false;
        gameWonRef.current = false;
        setScore(0);
      } catch (error) {
        console.error("Error in initGame:", error);
      }
    };

    // Place a token at a random empty position
    const placeToken = () => {
      try {
        let x: number, y: number;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops

        do {
          x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
          y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
          attempts++;

          if (attempts > maxAttempts) {
            console.warn("Max attempts reached when placing token");
            return; // Prevent infinite loop
          }
        } while (
          y < 0 ||
          y >= GRID_HEIGHT ||
          x < 0 ||
          x >= GRID_WIDTH || // Check bounds
          maze[y][x] === 1 ||
          tokens.some((t) => t && t.x === x && t.y === y) ||
          powerUps.some((p) => p && p.x === x && p.y === y) ||
          (player && player.x === x && player.y === y) ||
          apes.some((a) => a && a.x === x && a.y === y)
        );

        tokens.push({ x, y });
      } catch (error) {
        console.error("Error in placeToken:", error);
      }
    };

    // Place a power-up at a random empty position
    const placePowerUp = () => {
      try {
        let x: number, y: number;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops

        do {
          x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
          y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
          attempts++;

          if (attempts > maxAttempts) {
            console.warn("Max attempts reached when placing power-up");
            return; // Prevent infinite loop
          }
        } while (
          y < 0 ||
          y >= GRID_HEIGHT ||
          x < 0 ||
          x >= GRID_WIDTH || // Check bounds
          maze[y][x] === 1 ||
          tokens.some((t) => t && t.x === x && t.y === y) ||
          powerUps.some((p) => p && p.x === x && p.y === y) ||
          (player && player.x === x && player.y === y) ||
          apes.some((a) => a && a.x === x && a.y === y)
        );

        powerUps.push({ x, y, active: true });
      } catch (error) {
        console.error("Error in placePowerUp:", error);
      }
    };

    // Spawn new apes from existing ones or from corners if no apes exist
    const spawnNewApes = (count: number) => {
      try {
        for (let j = 0; j < count; j++) {
          if (apes && apes.length > 0) {
            // Choose a random existing ape to spawn from
            const parentApe = apes[Math.floor(Math.random() * apes.length)];
            if (!parentApe) {
              spawnApeInCorner();
              continue;
            }

            // Try to find a valid position near the parent ape
            const possibleDirections = [
              { x: -1, y: 0 },
              { x: 1, y: 0 },
              { x: 0, y: -1 },
              { x: 0, y: 1 },
              { x: -1, y: -1 },
              { x: 1, y: 1 },
              { x: -1, y: 1 },
              { x: 1, y: -1 },
            ];

            // Shuffle directions for randomness
            for (let i = possibleDirections.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [possibleDirections[i], possibleDirections[j]] = [
                possibleDirections[j],
                possibleDirections[i],
              ];
            }

            // Try each direction until we find a valid spawn point
            let spawned = false;
            for (const dir of possibleDirections) {
              const newX = parentApe.x + dir.x;
              const newY = parentApe.y + dir.y;

              // Check if position is valid (not a wall, not occupied)
              if (
                newX > 0 &&
                newX < GRID_WIDTH - 1 &&
                newY > 0 &&
                newY < GRID_HEIGHT - 1 &&
                maze[newY] &&
                maze[newY][newX] === 0 &&
                !apes.some((a) => a && a.x === newX && a.y === newY) &&
                !(player && player.x === newX && player.y === newY)
              ) {
                apes.push({
                  x: newX,
                  y: newY,
                  direction: { x: 0, y: 0 },
                });
                spawned = true;
                break;
              }
            }

            // If we couldn't spawn near an existing ape, use the old corner method
            if (!spawned) {
              spawnApeInCorner();
            }
          } else {
            // No existing apes, spawn in corner
            spawnApeInCorner();
          }
        }
      } catch (error) {
        console.error("Error in spawnNewApes:", error);
      }
    };

    // Helper function to spawn an ape in a corner
    const spawnApeInCorner = () => {
      try {
        const positions = [
          { x: 2, y: 2 },
          { x: GRID_WIDTH - 3, y: 2 },
          { x: 2, y: GRID_HEIGHT - 3 },
          { x: GRID_WIDTH - 3, y: GRID_HEIGHT - 3 },
        ];
        const pos = positions[Math.floor(Math.random() * positions.length)];
        apes.push({
          x: pos.x,
          y: pos.y,
          direction: { x: 0, y: 0 },
        });
      } catch (error) {
        console.error("Error in spawnApeInCorner:", error);
      }
    };

    // Move apes toward player with improved pursuit AI
    const moveApes = () => {
      try {
        if (!apes || !player) return;

        for (let i = 0; i < apes.length; i++) {
          const ape = apes[i];
          if (!ape || typeof ape.x !== "number" || typeof ape.y !== "number") {
            continue; // Skip invalid apes
          }

          // Check if ape is in a corner or against a wall
          // Make sure we're not accessing out of bounds maze cells
          const leftBlocked =
            ape.x <= 0 || !maze[ape.y] || maze[ape.y][ape.x - 1] === 1;
          const rightBlocked =
            ape.x >= GRID_WIDTH - 1 ||
            !maze[ape.y] ||
            maze[ape.y][ape.x + 1] === 1;
          const upBlocked =
            ape.y <= 0 || !maze[ape.y - 1] || maze[ape.y - 1][ape.x] === 1;
          const downBlocked =
            ape.y >= GRID_HEIGHT - 1 ||
            !maze[ape.y + 1] ||
            maze[ape.y + 1][ape.x] === 1;

          // Count how many directions are blocked
          const blockedCount = [
            leftBlocked,
            rightBlocked,
            upBlocked,
            downBlocked,
          ].filter((blocked) => blocked).length;
          const isStuck = blockedCount >= 2;

          // In power mode, apes try to run away from player
          // Otherwise, they aggressively pursue the player
          const targetX = powerModeState
            ? ape.x < player.x
              ? ape.x - 1
              : ape.x + 1
            : player.x;
          const targetY = powerModeState
            ? ape.y < player.y
              ? ape.y - 1
              : ape.y + 1
            : player.y;

          // Determine possible directions
          const possibleMoves = [];

          if (!leftBlocked) possibleMoves.push({ x: -1, y: 0 });
          if (!rightBlocked) possibleMoves.push({ x: 1, y: 0 });
          if (!upBlocked) possibleMoves.push({ x: 0, y: -1 });
          if (!downBlocked) possibleMoves.push({ x: 0, y: 1 });

          if (possibleMoves.length > 0) {
            // Only use randomness if the ape is stuck or very occasionally (10% chance)
            const useRandomMove = isStuck || Math.random() < 0.1;

            if (!useRandomMove) {
              // Find the move that gets closest to the player (or away in power mode)
              let bestMove = possibleMoves[0];
              let bestDistance = Number.POSITIVE_INFINITY;

              possibleMoves.forEach((move) => {
                const newX = ape.x + move.x;
                const newY = ape.y + move.y;

                // Calculate Manhattan distance to target
                const distance = powerModeState
                  ? -1 * (Math.abs(newX - targetX) + Math.abs(newY - targetY)) // Negative for fleeing
                  : Math.abs(newX - targetX) + Math.abs(newY - targetY); // Positive for chasing

                if (distance < bestDistance) {
                  bestDistance = distance;
                  bestMove = move;
                }
              });

              ape.direction = bestMove;
            } else {
              // Random move to help escape corners
              ape.direction =
                possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            }
          } else if (
            !ape.direction ||
            typeof ape.direction.x !== "number" ||
            typeof ape.direction.y !== "number"
          ) {
            // If no moves are possible and direction is invalid, set a default
            ape.direction = { x: 0, y: 0 };
          }

          // Update ape position
          ape.x += ape.direction.x;
          ape.y += ape.direction.y;

          // Ensure ape stays within bounds
          ape.x = Math.max(0, Math.min(GRID_WIDTH - 1, ape.x));
          ape.y = Math.max(0, Math.min(GRID_HEIGHT - 1, ape.y));

          // Check if ape has collided with the player's head
          if (ape.x === player.x && ape.y === player.y) {
            if (powerModeState) {
              // Player eats ape when powered up
              const capturedApeIndex = i;
              apes.splice(capturedApeIndex, 1);
              playSound('eatApe');
              setScore((prevScore) => prevScore + 10);

              // Remove two additional random apes if available
              if (apes.length >= 2) {
                const indicesToRemove: number[] = [];
                while (
                  indicesToRemove.length < 2 &&
                  indicesToRemove.length < apes.length
                ) {
                  const randomIndex = Math.floor(Math.random() * apes.length);
                  if (!indicesToRemove.includes(randomIndex)) {
                    indicesToRemove.push(randomIndex);
                  }
                }

                indicesToRemove.sort((a, b) => b - a);

                indicesToRemove.forEach((index) => {
                  apes.splice(index, 1);
                  setScore((prevScore) => prevScore + 5);
                });
              }

              // Respawn apes after a delay
              setTimeout(() => {
                const apesToRespawn = Math.min(3, 4 - apes.length);
                spawnNewApes(apesToRespawn);
              }, 3000);
              return;
            } else {
              // Ape catches player
              const newLives = Math.max(0, livesRef.current - 1);
              if (livesRef.current > newLives) { // Check if a life was actually lost
                playSound('lifeLost');
              }
              livesRef.current = newLives;
              setLives(newLives);
              if (newLives === 0) {
                setGameOver(true);
                gameOverRef.current = true;
              } else {
                player.x = Math.floor(GRID_WIDTH / 2);
                player.y = Math.floor(GRID_HEIGHT / 2);
                player.trail = [];
                player.direction = { x: 0, y: 0 };
              }
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error in moveApes:", error);
      }
    };

    // Draw function
    const draw = () => {
      try {
        if (!ctx || !canvas) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw maze
        ctx.fillStyle = "#0000AA";
        for (let y = 0; y < GRID_HEIGHT; y++) {
          for (let x = 0; x < GRID_WIDTH; x++) {
            if (maze[y] && maze[y][x] === 1) {
              ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
          }
        }

        // Draw tokens
        ctx.fillStyle = "#FFFF00";
        if (tokens) {
          tokens.forEach((token) => {
            if (!token) return;

            // Draw token as a square with a hole in the middle (like a coin)
            ctx.fillRect(
              token.x * GRID_SIZE + GRID_SIZE / 4,
              token.y * GRID_SIZE + GRID_SIZE / 4,
              GRID_SIZE / 2,
              GRID_SIZE / 2
            );
            ctx.fillStyle = "#000";
            ctx.fillRect(
              token.x * GRID_SIZE + (GRID_SIZE * 3) / 8,
              token.y * GRID_SIZE + (GRID_SIZE * 3) / 8,
              GRID_SIZE / 4,
              GRID_SIZE / 4
            );
            ctx.fillStyle = "#FFFF00";
          });
        }

        // Draw power-ups
        ctx.fillStyle = "#00FFFF";
        if (powerUps) {
          powerUps.forEach((powerUp) => {
            if (!powerUp || !powerUp.active) return;

            ctx.beginPath();
            ctx.arc(
              powerUp.x * GRID_SIZE + GRID_SIZE / 2,
              powerUp.y * GRID_SIZE + GRID_SIZE / 2,
              GRID_SIZE / 3,
              0,
              Math.PI * 2
            );
            ctx.fill();
          });
        }

        // Draw player trail
        if (player && player.trail) {
          ctx.fillStyle = "#00FF00";
          player.trail.forEach((pos, i) => {
            if (!pos) return;

            const size = GRID_SIZE * (0.5 + (i / player.trail.length) * 0.5);
            ctx.fillRect(
              pos.x * GRID_SIZE + (GRID_SIZE - size) / 2,
              pos.y * GRID_SIZE + (GRID_SIZE - size) / 2,
              size,
              size
            );
          });
        }

        // Draw player
        if (player) {
          const playerCenterX = player.x * GRID_SIZE + GRID_SIZE / 2;
          const playerCenterY = player.y * GRID_SIZE + GRID_SIZE / 2;
          const playerRadius = GRID_SIZE / 2;

          if (powerModeState) {
            // Power mode appearance
            // Aura
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, playerRadius + GRID_SIZE / 4, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; // Semi-transparent white aura
            ctx.fill();
            ctx.closePath();
            
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, playerRadius + GRID_SIZE / 8, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 255, 255, 0.5)"; // Semi-transparent cyan aura
            ctx.fill();
            ctx.closePath();

            // Main face
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, playerRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#00FFFF"; // Cyan face
            ctx.fill();
            ctx.closePath();
          } else {
            // Standard appearance
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, playerRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#FFD600"; // Yellow face
            ctx.fill();
            ctx.closePath();
          }

          // Draw eyes
          ctx.beginPath();
          ctx.arc(
            player.x * GRID_SIZE + GRID_SIZE / 3,
            player.y * GRID_SIZE + GRID_SIZE / 2.5,
            GRID_SIZE / 10,
            0,
            Math.PI * 2
          );
          ctx.arc(
            player.x * GRID_SIZE + (GRID_SIZE * 2) / 3,
            player.y * GRID_SIZE + GRID_SIZE / 2.5,
            GRID_SIZE / 10,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = "#222";
          ctx.fill();
          ctx.closePath();

          // Draw smile
          ctx.beginPath();
          ctx.arc(playerCenterX, playerCenterY + GRID_SIZE / 6, playerRadius / 2.5, 0, Math.PI); // Adjusted smile position slightly
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#222";
          ctx.stroke();
          ctx.closePath();
        }

        // Draw apes
        if (apes) {
          apes.forEach((ape) => {
            if (!ape) return;

            const baseX = ape.x * GRID_SIZE;
            const baseY = ape.y * GRID_SIZE;

            // Ape body
            ctx.fillStyle = powerModeState ? "#0000FF" : "#8B4513";
            ctx.fillRect(baseX, baseY, GRID_SIZE, GRID_SIZE);

            // Ape ears
            ctx.fillRect(
              baseX - GRID_SIZE / 6,
              baseY + GRID_SIZE / 6,
              GRID_SIZE / 6,
              GRID_SIZE / 3
            );
            ctx.fillRect(
              baseX + GRID_SIZE,
              baseY + GRID_SIZE / 6,
              GRID_SIZE / 6,
              GRID_SIZE / 3
            );

            // Ape face
            ctx.fillStyle = powerModeState ? "#0000AA" : "#A0522D";
            ctx.fillRect(
              baseX + GRID_SIZE / 4,
              baseY + GRID_SIZE / 2,
              GRID_SIZE / 2,
              GRID_SIZE / 3
            );

            // Ape eyes
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(
              baseX + GRID_SIZE / 4,
              baseY + GRID_SIZE / 4,
              GRID_SIZE / 6,
              GRID_SIZE / 6
            );
            ctx.fillRect(
              baseX + (GRID_SIZE * 3) / 5,
              baseY + GRID_SIZE / 4,
              GRID_SIZE / 6,
              GRID_SIZE / 6
            );

            // Ape mouth
            ctx.fillStyle = "#000";
            ctx.fillRect(
              baseX + GRID_SIZE / 3,
              baseY + (GRID_SIZE * 2) / 3,
              GRID_SIZE / 3,
              GRID_SIZE / 6
            );
          });
        }

        // Score, lives, and power mode timer are now displayed via HTML elements
      } catch (error) {
        console.error("Error in draw:", error);
      }
    };

    // Check collisions
    const checkCollisions = () => {
      try {
        // Ensure player and player.direction are defined
        if (!player || !player.direction) {
          console.error("Player or player direction is undefined");
          return;
        }

        // Check wall collisions
        const nextX = player.x + (player.direction.x || 0);
        const nextY = player.y + (player.direction.y || 0);

        // Make sure we're not accessing out of bounds maze cells
        if (
          nextY < 0 ||
          nextY >= maze.length ||
          nextX < 0 ||
          nextX >= maze[0].length
        ) {
          player.direction = { x: 0, y: 0 };
          return;
        }

        // Make sure maze[nextY] exists before accessing maze[nextY][nextX]
        if (maze[nextY] && maze[nextY][nextX] === 1) {
          // Hit a wall, stop moving
          player.direction = { x: 0, y: 0 };
          return;
        }

        // Update player position
        player.x = nextX;
        player.y = nextY;

        // Add current position to trail
        player.trail.push({ x: player.x, y: player.y });

        // Trim trail to tail length
        while (player.trail.length > player.tailLength) {
          player.trail.shift();
        }

        // Check token collisions
        if (tokens) {
          for (let i = tokens.length - 1; i >= 0; i--) {
            const token = tokens[i];
            if (token && token.x === player.x && token.y === player.y) {
              // Token collection logic
              tokens.splice(i, 1);
              playSound('token');
              player.tailLength += 1;
              tokensCollectedRef.current += 1;
              const newTokens = tokensCollectedRef.current;
              setTokensCollected(newTokens);
              setScore((prevScore) => prevScore + 1);

              // Check win condition
              if (newTokens >= TOKENS_TO_WIN) {
                setGameWon(true);
                gameWonRef.current = true;
                setShowWinModal(true);
                // Exit immediately after collecting token that meets win condition
                return;
              }

              // Place a new token
              placeToken();

              // Break out of loop (important - only collect one token per frame)
              break;
            }
          }
        }

        // Check power-up collisions
        if (powerUps) {
          for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            if (
              powerUp &&
              powerUp.x === player.x &&
              powerUp.y === player.y &&
              powerUp.active
            ) {
              powerUps.splice(i, 1);
              setPowerModeState(true);
              setPowerModeTimerState(300); // 10 seconds at 30fps
              setScore((prevScore) => prevScore + 5);
              placePowerUp();
            }
          }
        }

        // Update power mode timer
        // Update power mode timer
        if (powerModeState && !isPaused) { // Only decrement if not paused
          setPowerModeTimerState(prev => {
            if (prev <= 1) {
              setPowerModeState(false);
              return 0;
            }
            return prev - 1;
          });
        }
      } catch (error) {
        console.error("Error in checkCollisions:", error);
      }
    };

    // Handle keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        if ((gameOverRef.current || gameWonRef.current) && e.code === "Space") {
          setGameOver(false);
          setGameWon(false);
          gameOverRef.current = false;
          gameWonRef.current = false;
          setShowWinModal(false);
          setScore(0);
          livesRef.current = 3;
          setLives(3);
          initGame();
          if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
          }
          gameLoopId = requestAnimationFrame(gameLoop);
          return;
        }

        // Handle Pause Key -> Toggle isPaused state
        if (e.code === "KeyP") {
          if (gameStarted && !gameOverRef.current && !gameWonRef.current) {
            setIsPaused(prevPaused => !prevPaused);
          }
          return; // Prevent other key actions when 'P' is pressed
        }

        // Ignore game input if paused, game over, or game won
        if (isPaused || gameOverRef.current || gameWonRef.current) {
          return;
        }

        if (!player || !player.direction) {
          player = {
            ...player,
            direction: { x: 0, y: 0 },
          };
        }

        switch (e.code) {
          case "ArrowLeft":
            if (player.direction.x === 0) {
              // Prevent 180-degree turns
              player.direction = { x: -1, y: 0 };
            }
            break;
          case "ArrowRight":
            if (player.direction.x === 0) {
              player.direction = { x: 1, y: 0 };
            }
            break;
          case "ArrowUp":
            if (player.direction.y === 0) {
              player.direction = { x: 0, y: -1 };
            }
            break;
          case "ArrowDown":
            if (player.direction.y === 0) {
              player.direction = { x: 0, y: 1 };
            }
            break;
        }
      } catch (error) {
        console.error("Error in handleKeyDown:", error);
      }
    };

    // Game loop
    const gameLoop = () => {
      try {
        // Request next frame immediately
        gameLoopId = requestAnimationFrame(gameLoop);

        // Handle Paused State
        if (isPaused) {
          draw(); // Keep drawing the current state
          // Display Paused Message
          if (ctx && canvas) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; // Semi-transparent overlay
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#FFFF00"; // Yellow text
            ctx.font = "bold 48px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
            ctx.font = "bold 24px monospace";
            ctx.fillText("Press P to Resume", canvas.width / 2, canvas.height / 2 + 40);
          }
          return; // Skip all game logic below if paused
        }

        // Normal game over
        if (gameOverRef.current) {
          // Draw game over screen with overlay
          if (!ctx || !canvas) return;
          // Semi-transparent black overlay
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // GAME OVER text
          ctx.fillStyle = "#FF3333";
          ctx.font = "bold 36px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("Oh no! The intelligent", canvas.width / 2, canvas.height / 2 - 100);
          ctx.fillText("apes got you!", canvas.width / 2, canvas.height / 2 - 60);

          // Button-like prompt
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(
            canvas.width / 2 - 220,
            canvas.height / 2 + 40,
            440,
            60,
            20
          );
          ctx.fillStyle = "#222";
          ctx.globalAlpha = 0.95;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#FF3333";
          ctx.stroke();
          ctx.closePath();
          ctx.restore();

          ctx.fillStyle = "#FF3333";
          ctx.font = "bold 28px monospace";
          ctx.fillText(
            "PRESS SPACE TO PLAY AGAIN",
            canvas.width / 2,
            canvas.height / 2 + 70
          );

          return;
        }

        // Check if game is won
        if (gameWonRef.current) {
          draw(); // Keep drawing the win state
          return; // Stop game logic
        }

        // Only run game logic if not paused (already handled by the check at the top of gameLoop)
        // Increment frame counter
        frameCounter++;

        // Only move apes on certain frames
        if (frameCounter % APE_SPEED === 0) { // No need to check gameOver/gameWon here due to earlier returns
          moveApes();
        }

        // Only move player on certain frames
        if (frameCounter % PLAYER_SPEED === 0) {
          // Apply intended direction from touch controls
          if (intendedDirectionRef.current) {
            const newDir = intendedDirectionRef.current;
            if (newDir.x !== 0 && player.direction.x === 0) { // Moving horizontally, was vertical or still
              player.direction = { x: newDir.x, y: 0 };
            } else if (newDir.y !== 0 && player.direction.y === 0) { // Moving vertically, was horizontal or still
              player.direction = { x: 0, y: newDir.y };
            }
            intendedDirectionRef.current = null; // Consume the input
          }
          checkCollisions(); // This also updates powerModeTimerState (which checks isPaused internally)
        }

        draw(); // Draw the new game state
      } catch (error) {
        console.error("Error in game loop:", error);
        // If an error occurs, we still want to try to keep the loop going if possible,
        // but requestAnimationFrame is already at the top.
      }
    };

    // --- Ape spawn interval ---
    // Clear previous interval if any (e.g., if gameStarted changes or on hot reload)
    if (apeIntervalIdRef.current !== undefined) {
      clearInterval(apeIntervalIdRef.current);
    }
    apeIntervalIdRef.current = window.setInterval(() => {
      // Check isPaused directly from component state.
      // Also ensure game is active and not over/won.
      if (!isPaused && gameStarted && !gameOverRef.current && !gameWonRef.current && apes.length < 8) {
        spawnNewApes(1);
      }
    }, 10000);

    // Initialize game
    initGame();

    // Start game loop
    gameLoopId = requestAnimationFrame(gameLoop); // Initial call to start the loop

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup for the main game useEffect
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(gameLoopId);
      if (apeIntervalIdRef.current !== undefined) {
        clearInterval(apeIntervalIdRef.current);
        apeIntervalIdRef.current = undefined; // Clear the ref on unmount/game stop
      }
    };
  }, [gameStarted]); // isPaused is NOT in dependency array; interval callback and gameLoop check it directly.

  // Keep refs in sync with state for display
  useEffect(() => {
    tokensCollectedRef.current = tokensCollected;
    livesRef.current = lives;
    gameOverRef.current = gameOver;
    gameWonRef.current = gameWon;
  }, [tokensCollected, lives, gameOver, gameWon]);

  // Prevent body scroll when game modal is active
  useEffect(() => {
    if (gameStarted) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [gameStarted]);

  // Restart game function
  const restartGame = () => {
    setGameOver(false);
    setGameWon(false);
    gameOverRef.current = false;
    gameWonRef.current = false;
    setShowWinModal(false);
    setScore(0);
    setLives(3);
    tokensCollectedRef.current = 0;
    livesRef.current = 3;
  };

  return (
    <>
      {/* Game Start Screen */}
      {!gameStarted && (
        <div className="flex flex-col items-center justify-center w-full max-w-[800px] mx-auto relative">
          <div
            className="flex flex-col items-center justify-center p-8 w-full h-[600px] relative overflow-hidden"
            style={{
              backgroundImage: "url('/a-ok-8bit-retro.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Overlay for readability */}
            <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />
            <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-5xl mb-24 text-center font-bold text-white drop-shadow-lg">
                RUN, HUMAN, RUN!
              </h2>
              <div className="mb-8 text-center text-white drop-shadow-lg font-bold">
                <p className="mb-4 inline-block px-4 py-2 rounded bg-black bg-opacity-50">
                  Use arrow keys to move
                </p>
                <p className="mb-4 inline-block px-4 py-2 rounded bg-black bg-opacity-50">
                  Collect 3 UBI Credits to win!
                </p>
                <p className="mb-4 inline-block px-4 py-2 rounded bg-black bg-opacity-50">
                  Blue power-ups let you eat apes!
                </p>
                <p className="mb-4 inline-block px-4 py-2 rounded bg-black bg-opacity-50">
                  Avoid apes unless you have power-up
                </p>
              </div>
              <button
                onClick={() => {
                  if (!audioContextRef.current) {
                    try {
                      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                    } catch (e) {
                      console.error("Web Audio API is not supported in this browser", e);
                    }
                  }
                  if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume().catch(e => console.error("AudioContext resume failed on start", e));
                  }
                  setGameStarted(true);
                  playSound('gameStart');
                }}
                className="px-8 py-4 mt-16 bg-green-500 text-white font-bold rounded shadow-lg"
              >
                START GAME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Modal */}
      {gameStarted && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-40">
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Close button */}
            <button
              onClick={() => setGameStarted(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold z-50 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
              title="Close Game"
            >
              ×
            </button>

            <canvas
              ref={canvasRef}
              width={700}
              height={500}
              className="border border-gray-800 bg-black"
              style={{
                maxWidth: "min(100vw - 2rem, 700px)",
                maxHeight: "min(100vh - 2rem, 500px)",
                width: "auto",
                height: "auto",
              }}
              tabIndex={0}
            />
            {/* Pause Button */}
            <button
              onClick={() => {
                if (gameStarted && !gameOver && !gameWon) {
                  setIsPaused(!isPaused);
                }
              }}
              className="absolute top-14 right-4 text-white hover:text-gray-300 text-sm font-bold z-50 bg-black bg-opacity-60 rounded px-3 py-2"
              title={isPaused ? "Resume Game (P)" : "Pause Game (P)"}
              disabled={!gameStarted || gameOver || gameWon}
            >
              {isPaused ? "RESUME (P)" : "PAUSE (P)"}
            </button>
            {/* Status Display */}
            <div
              className="absolute top-2 left-2 text-white p-2 rounded"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            >
              <p className="font-mono text-lg">UBI Credits: {tokensCollected}/3</p>
            </div>
            <div
              className="absolute top-2 right-2 text-white p-2 rounded"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            >
              <p className="font-mono text-lg">Lives: {lives}</p>
            </div>
            {powerModeState && (
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 text-cyan-400 p-2 rounded"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
              >
                <p className="font-mono text-lg">Power: {Math.ceil(powerModeTimerState / 30)}s</p>
              </div>
            )}
            {/* Pause Overlay - This is now drawn on canvas, but an HTML overlay is also an option if preferred */}
            
            {/* Touch Controls */}
            {gameStarted && !gameOver && !gameWon && !isPaused && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1 md:hidden"> {/* md:hidden to hide on larger screens */}
                {/* Up Button */}
                <button
                  onTouchStart={(e) => { e.preventDefault(); intendedDirectionRef.current = { x: 0, y: -1 }; }}
                  onMouseDown={(e) => { e.preventDefault(); intendedDirectionRef.current = { x: 0, y: -1 }; }}
                  className="bg-gray-600 bg-opacity-70 text-white text-2xl font-bold w-16 h-12 rounded-md flex items-center justify-center active:bg-gray-500"
                >
                  ↑
                </button>
                <div className="flex space-x-1">
                  {/* Left Button */}
                  <button
                    onTouchStart={(e) => { e.preventDefault(); intendedDirectionRef.current = { x: -1, y: 0 }; }}
                    onMouseDown={(e) => { e.preventDefault(); intendedDirectionRef.current = { x: -1, y: 0 }; }}
                    className="bg-gray-600 bg-opacity-70 text-white text-2xl font-bold w-16 h-12 rounded-md flex items-center justify-center active:bg-gray-500"
                  >
                    ←
                  </button>
                  {/* Down Button */}
                  <button
                    onTouchStart={(e) => { e.preventDefault(); intendedDirectionRef.current = { x: 0, y: 1 }; }}
                    onMouseDown={(e) => { e.preventDefault(); intendedDirectionRef.current = { x: 0, y: 1 }; }}
                    className="bg-gray-600 bg-opacity-70 text-white text-2xl font-bold w-16 h-12 rounded-md flex items-center justify-center active:bg-gray-500"
                  >
                    ↓
                  </button>
                  {/* Right Button */}
                  <button
                    onTouchStart={(e) => { e.preventDefault(); intendedDirectionRef.current = { x: 1, y: 0 }; }}
                    onMouseDown={(e) => { e.preventDefault(); intendedDirectionRef.current = { x: 1, y: 0 }; }}
                    className="bg-gray-600 bg-opacity-70 text-white text-2xl font-bold w-16 h-12 rounded-md flex items-center justify-center active:bg-gray-500"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-green-500 rounded-lg p-8 text-center max-w-md mx-4">
            <h2 className="text-4xl font-bold text-green-400 mb-6">YOU WIN!</h2>
            <p className="text-white text-lg mb-6">Congratulations! You collected all 3 UBI Credits!</p>
            
            <button
              onClick={restartGame}
              className="bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-3 px-8 rounded shadow-lg transition-colors"
            >
              PLAY AGAIN
            </button>

            <p className="text-gray-400 text-sm mt-4">
              or press SPACE to restart
            </p>
          </div>
        </div>
      )}
    </>
  );
}