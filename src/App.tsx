/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import FlappyGame from './components/FlappyGame';
import { motion, AnimatePresence } from 'motion/react';

type GameState = 'START' | 'PLAYING' | 'GAME_OVER';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [lastScore, setLastScore] = useState(0);

  const handleGameOver = useCallback((score: number) => {
    setLastScore(score);
    setGameState('GAME_OVER');
    
    // Save high score
    const currentHigh = localStorage.getItem('flappy-human-highscore');
    if (!currentHigh || score > parseInt(currentHigh, 10)) {
      localStorage.setItem('flappy-human-highscore', score.toString());
    }
  }, []);

  const handleStart = useCallback(() => {
    setGameState('PLAYING');
  }, []);

  return (
    <div className="h-screen h-[100dvh] bg-slate-900 flex flex-col items-center justify-center overflow-hidden selection:bg-sky-500 selection:text-white">
      <div className="w-full h-full max-w-md relative shadow-2xl overflow-hidden bg-black">
        <FlappyGame 
          gameState={gameState} 
          onGameOver={handleGameOver} 
          onGameStart={handleStart}
        />
      </div>

      {/* Background Decorative Elements - Only visible on wider screens */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden hidden md:block">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
