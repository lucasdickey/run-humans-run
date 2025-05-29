"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the game component with no SSR
const RunHumansRun = dynamic(
  () => import("../components/RunHumansRun"),
  { ssr: false }
);

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [tokensCollected, setTokensCollected] = useState(0);

  const handleGameComplete = (success: boolean) => {
    console.log("Game completed with success:", success);
  };

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="w-full max-w-4xl mx-auto">
        <RunHumansRun
          gameStarted={gameStarted}
          setGameStarted={setGameStarted}
          score={score}
          setScore={setScore}
          lives={lives}
          setLives={setLives}
          gameOver={gameOver}
          setGameOver={setGameOver}
          gameWon={gameWon}
          setGameWon={setGameWon}
          tokensCollected={tokensCollected}
          setTokensCollected={setTokensCollected}
          onGameComplete={handleGameComplete}
        />
      </div>
    </main>
  );
}