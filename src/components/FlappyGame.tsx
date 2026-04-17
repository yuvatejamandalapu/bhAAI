import { useEffect, useRef, useState, useCallback } from 'react';
import { gameAudio } from '../lib/audio';
import { motion } from 'motion/react';

// Robust asset URL helper for different deployment environments
const getAssetUrl = (path: string) => {
  const base = (import.meta as any).env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : base + '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return cleanBase + cleanPath;
};

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

interface GameProps {
  onGameOver: (score: number) => void;
  gameState: 'START' | 'PLAYING' | 'GAME_OVER';
  onGameStart: () => void;
}

const HUMAN_IMAGE_URL = '/player.jpeg';
const WINNER_VIDEO_URL = '/winner.mp4';
const BGM_URL = '/bgm.mp3';

export default function FlappyGame({ onGameOver, gameState, onGameStart }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('flappy-human-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [dimensions, setDimensions] = useState({ width: 360, height: 640 });
  const dimensionsRef = useRef(dimensions);
  const [isShaking, setIsShaking] = useState(false);
  const [assetErrors, setAssetErrors] = useState<string[]>([]);

  // Trigger shake on score 11
  useEffect(() => {
    if (score === 11) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [score]);

  // Game state refs (to avoid closure issues in the loop)
  const stateRef = useRef({
    birdY: 250,
    birdVelocity: 0,
    pipes: [] as Pipe[],
    score: 0,
    gameActive: false,
    frameCount: 0,
    backgroundX: 0,
  });

  const birdImg = useRef<HTMLImageElement | null>(null);

  // Responsive Canvas Sizing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        dimensionsRef.current = { width, height };
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const pImg = new Image();
    pImg.src = HUMAN_IMAGE_URL;
    pImg.onload = () => {
      birdImg.current = pImg;
    };
    pImg.onerror = () => {
      console.warn("Retrying player image with fallback...");
      // Try a public URL if the local file is corrupted or mislabeled
      const fallback = 'https://picsum.photos/seed/actor/200/200';
      pImg.src = fallback;
    };
  }, []);

  const resetGame = useCallback(() => {
    stateRef.current = {
      birdY: 250,
      birdVelocity: 0,
      pipes: [],
      score: 0,
      gameActive: true,
      frameCount: 0,
      backgroundX: 0,
    };
    setScore(0);
    gameAudio.playBGM();
    onGameStart();
  }, [onGameStart]);

  const jump = useCallback(() => {
    if (gameState === 'START' || gameState === 'GAME_OVER') {
      resetGame();
    } else if (gameState === 'PLAYING') {
      stateRef.current.birdVelocity = -7;
      gameAudio.playJump();
    }
  }, [gameState, resetGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const BASE_SPEED = 1; // Multiplier for delta time
    const GRAVITY = 0.35;
    const PIPE_WIDTH = 70;
    const PIPE_GAP = 180;
    const PIPE_SPEED = 3.5;
    const BIRD_SIZE = 50;
    const HITBOX_PADDING = 10; // Make collision more forgiving

    // Particle/Juice Effects
    const speedLines: {x: number, y: number, length: number}[] = [];
    for(let i=0; i<10; i++) speedLines.push({x: Math.random() * dimensionsRef.current.width, y: Math.random() * dimensionsRef.current.height, length: 20 + Math.random() * 40});

    const draw = (time: number) => {
      const { width, height } = dimensionsRef.current;
      const deltaTime = (time - lastTime) / (1000 / 60); // Normalize to 60fps
      lastTime = time;

      const state = stateRef.current;
      
      // Update canvas internal res if changed
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Background - Simple sky and ground
      ctx.fillStyle = '#72c5e1'; // Sky
      ctx.fillRect(0, 0, width, height * 0.7);
      
      ctx.fillStyle = '#76c733'; // Ground
      ctx.fillRect(0, height * 0.7, width, height * 0.3);

      // Background Branding - MAVIGUN (Elite Neon Display)
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.font = '900 90px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-Math.PI / 6);
      
      // Animate scale subtly over time
      const pulse = 1 + Math.sin(Date.now() / 1000) * 0.05;
      ctx.scale(pulse, pulse);

      const nameGradient = ctx.createLinearGradient(-150, 0, 150, 0);
      nameGradient.addColorStop(0, '#ff0088'); // Pink
      nameGradient.addColorStop(0.3, '#ffcc00'); // Gold
      nameGradient.addColorStop(0.5, '#00ffcc'); // Cyan
      nameGradient.addColorStop(0.7, '#0088ff'); // Blue
      nameGradient.addColorStop(1, '#ff00ff'); // Magenta
      
      ctx.fillStyle = nameGradient;
      ctx.shadowColor = 'rgba(255,255,255,1)';
      ctx.shadowBlur = 30;
      ctx.fillText("MAVIGUN", 0, 0);
      
      // Add a secondary glow
      ctx.globalAlpha = 0.3;
      ctx.shadowBlur = 50;
      ctx.fillText("MAVIGUN", 0, 0);
      ctx.restore();

      // Draw Speed Lines for "Juice"
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      speedLines.forEach(line => {
        line.x -= PIPE_SPEED * 2;
        if (line.x < -line.length) line.x = width + line.length;
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x + line.length, line.y);
        ctx.stroke();
      });

      if (state.gameActive) {
        // Update Physics
        state.birdVelocity += GRAVITY * deltaTime;
        state.birdY += state.birdVelocity * deltaTime;

        // Pipe Management
        state.frameCount += deltaTime;
        if (state.frameCount >= 100) {
          state.frameCount = 0;
          const minHeight = 50;
          const maxHeight = height - PIPE_GAP - 50;
          const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
          state.pipes.push({
            x: width,
            topHeight,
            bottomHeight: height - topHeight - PIPE_GAP,
            passed: false,
          });
        }

        // Update Pipes
        state.pipes.forEach((pipe, index) => {
          pipe.x -= PIPE_SPEED * deltaTime;

          // Check if passed
          if (!pipe.passed && pipe.x + PIPE_WIDTH < width / 4) {
            pipe.passed = true;
            state.score++;
            setScore(state.score);
            gameAudio.playPass();
          }

          // Collision Detection
          const birdX = width / 4;
          const birdBox = {
            left: birdX - BIRD_SIZE / 2 + HITBOX_PADDING,
            right: birdX + BIRD_SIZE / 2 - HITBOX_PADDING,
            top: state.birdY - BIRD_SIZE / 2 + HITBOX_PADDING,
            bottom: state.birdY + BIRD_SIZE / 2 - HITBOX_PADDING,
          };

          const topPipeBox = {
            left: pipe.x,
            right: pipe.x + PIPE_WIDTH,
            top: 0,
            bottom: pipe.topHeight,
          };

          const bottomPipeBox = {
            left: pipe.x,
            right: pipe.x + PIPE_WIDTH,
            top: height - pipe.bottomHeight,
            bottom: height,
          };

          const checkCollision = (rect1: any, rect2: any) => {
            return (
              rect1.left < rect2.right &&
              rect1.right > rect2.left &&
              rect1.top < rect2.bottom &&
              rect1.bottom > rect2.top
            );
          };

          if (checkCollision(birdBox, topPipeBox) || checkCollision(birdBox, bottomPipeBox)) {
            endGame();
          }
        });

        // Remove off-screen pipes
        if (state.pipes.length > 0 && state.pipes[0].x + PIPE_WIDTH < 0) {
          state.pipes.shift();
        }

        // Ground/Ceiling check
        if (state.birdY + BIRD_SIZE / 2 > height || state.birdY - BIRD_SIZE / 2 < 0) {
          endGame();
        }
      }

      function endGame() {
        state.gameActive = false;
        gameAudio.stopBGM();
        gameAudio.playCrash();
        onGameOver(state.score);
      }

      // Draw Pipes - Match Design HTML Colors (Sleek Interface)
      state.pipes.forEach(pipe => {
        // Top Pipe Body
        ctx.fillStyle = '#444';
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        
        // Label Pillar as "N"
        ctx.fillStyle = '#fff';
        ctx.font = '900 40px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText("N", pipe.x + PIPE_WIDTH / 2, pipe.topHeight / 2);

        // Top Pipe Cap
        ctx.fillStyle = '#222';
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);
        
        // Bottom Pipe Body
        ctx.fillStyle = '#444';
        ctx.fillRect(pipe.x, height - pipe.bottomHeight, PIPE_WIDTH, pipe.bottomHeight);
        
        // Label Pillar as "I"
        ctx.fillStyle = '#fff';
        ctx.fillText("I", pipe.x + PIPE_WIDTH / 2, height - (pipe.bottomHeight / 2));

        // Bottom Pipe Cap
        ctx.fillStyle = '#222';
        ctx.fillRect(pipe.x - 5, height - pipe.bottomHeight, PIPE_WIDTH + 10, 20);
      });

      // Draw Bird (Human)
      const birdX = width / 4;
      ctx.save();
      ctx.translate(birdX, state.birdY);
      
      // Rotate based on velocity for juice
      const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (state.birdVelocity * 0.1)));
      ctx.rotate(rotation);

      if (birdImg.current) {
        // Add a slight glow around bhAAi
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 15;
        ctx.drawImage(birdImg.current, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
        ctx.shadowBlur = 0;
      } else {
        // Fallback circle for the face if image hasn't loaded
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();

      // UI Score overlay is handled by React for better styling, but could be drawn here too.

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [onGameOver]);

  return (
    <motion.div 
      ref={containerRef}
      className="relative w-full h-full bg-[#333] overflow-hidden shadow-2xl border-none"
      animate={isShaking ? {
        x: [0, -10, 10, -10, 10, 0],
        y: [0, 5, -5, 5, -5, 0],
      } : {}}
      transition={{ duration: 0.4 }}
      onClick={jump}
      onTouchStart={(e) => {
        // Prevent default zoom/refresh on double tap or long press
        jump();
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
      />
      
      {/* HUD Score */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-12 left-0 right-0 text-center pointer-events-none">
          <div className="text-7xl font-black text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
            {score}
          </div>
        </div>
      )}
      
      {/* Start Screen */}
      {gameState === 'START' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="bg-panel-bg backdrop-blur-md rounded-[32px] p-8 w-full max-w-[280px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300 pointer-events-auto border border-white/20">
            <div className="mb-6 flex justify-center">
               <img src={HUMAN_IMAGE_URL} className="w-20 h-20 rounded-full border-4 border-white shadow-xl" alt="Player" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-3xl font-black mb-2 text-[#222] uppercase tracking-tighter text-balance">bhAAi(not buggala hari)</h1>
            <p className="text-[14px] text-red-600 mb-8 leading-tight font-black uppercase tracking-tight animate-pulse">
              score 11 to surprise
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); resetGame(); }}
              className="w-full bg-[#222] text-white py-5 rounded-[20px] font-black text-xl hover:scale-[0.98] transition-all shadow-xl active:scale-90"
            >
              press bhAAi buggal
            </button>
          </div>
          <div className="mt-8 text-[11px] uppercase tracking-[0.3em] text-[#222] font-bold opacity-40">
            High Score: {highScore}
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-black/20 backdrop-blur-sm">
           {assetErrors.length > 0 && (
             <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white text-[10px] p-2 rounded-lg z-50 text-left font-mono shadow-xl border border-white/20">
               <p className="font-black mb-1">ASSET LOAD WARNING:</p>
               {assetErrors.map((err, i) => <p key={i}>â€¢ {err} failed to load</p>)}
               <p className="mt-1 opacity-70">Check if files exist in /public folder and are not 0 bytes.</p>
             </div>
           )}
           <div className={`bg-panel-bg backdrop-blur-md rounded-[32px] p-8 w-full max-w-[280px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300 pointer-events-auto border ${score >= 11 ? 'border-yellow-400 border-4 shadow-[0_0_30px_rgba(250,204,21,0.4)]' : 'border-white/20'}`}>
            <h1 className={`text-2xl font-black mb-1 uppercase tracking-tighter leading-tight text-balance ${score >= 11 ? 'text-yellow-600' : 'text-[#e74c3c]'}`}>
              {score >= 11 ? (
                <div className="flex flex-col gap-2">
                   <div className="bg-yellow-400 text-black text-xs py-1 px-3 rounded-full self-center animate-bounce font-bold shadow-lg">
                    CHAMPION UNLOCKED
                  </div>
                  <span>you are the 11th winner twin please get ajob fr 🏆</span>
                  <span className="text-yellow-700 text-base bg-yellow-100 py-3 px-4 rounded-2xl border-2 border-yellow-300 animate-pulse font-black shadow-lg">
                    FINALLY CHEYSAV KANNI POI VERE PANI CHESUKO PILLA KOJJA
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="bg-red-600 text-white text-[10px] py-1 px-3 rounded-full self-center animate-pulse font-bold shadow-md">
                    SCORE LIMIT NOT REACHED
                  </div>
                  <span>way to jagan heart failed due to chows 😟</span>
                  <span className="text-white text-base bg-red-600 py-3 px-4 rounded-xl border-b-4 border-red-800 animate-bounce font-black shadow-[0_5px_0_0_rgba(153,27,27,1)]">
                    erripuka 11 kuda score cheyaleva
                  </span>
                </div>
              )}
            </h1>

            {score >= 11 && (
              <div className="my-4 rounded-2xl overflow-hidden shadow-2xl border-2 border-yellow-400 bg-black animate-in fade-in zoom-in duration-500 delay-300 fill-mode-both">
                <video 
                  src={WINNER_VIDEO_URL} 
                  autoPlay 
                  loop 
                  playsInline 
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    console.error("Winner video failed to load:", e);
                    setAssetErrors(prev => [...prev.filter(err => err !== "Winner Video (winner.mp4)"), "Winner Video (winner.mp4)"]);
                  }}
                />
              </div>
            )}
            
            <p className="text-[11px] uppercase tracking-widest text-[#666] mb-4 font-black opacity-60">Mission Report</p>
            
            <div className="flex flex-col items-center mb-4">
              <span className="text-[10px] text-[#666] uppercase font-bold">Total Score</span>
              <div className="text-6xl font-black text-[#222] leading-none mb-2">
                {score}
              </div>
              <div className="text-[14px] font-black text-red-500 uppercase animate-bounce">
                GET A JOB
              </div>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); resetGame(); }}
              className="w-full bg-[#222] text-white py-5 rounded-[20px] font-black text-xl hover:scale-[0.98] transition-all shadow-xl active:scale-90"
            >
              press again
            </button>
          </div>
        </div>
      )}

    </motion.div>
  );
}
