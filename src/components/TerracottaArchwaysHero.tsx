import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  ArrowDown,
  SlidersHorizontal,
  Plus,
  Sun,
  Sunset,
  Sunrise,
  ShieldCheck,
  Zap,
  DollarSign,
  Calendar,
  Store,
  Lightbulb,
} from 'lucide-react';

import { PlannerTab } from '../types';

interface TerracottaArchwaysHeroProps {
  onOpenCreate: () => void;
  onOpenReplan: () => void;
  onSelectTab?: (tab: PlannerTab) => void;
  onScrollToWorkspace?: () => void;
  hasActiveEvent: boolean;
  activeEventName?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type LightingMood = 'golden' | 'noon' | 'twilight';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  opacityDelta: number;
}

export const TerracottaArchwaysHero: React.FC<TerracottaArchwaysHeroProps> = ({
  onOpenCreate,
  onOpenReplan,
  onSelectTab,
  onScrollToWorkspace,
  hasActiveEvent,
  activeEventName,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parallax offsets
  const [mouseOffset, setMouseOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Lighting mood
  const [lighting, setLighting] = useState<LightingMood>('golden');

  // Interactive light follower
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });

  // Parallax offsets handled cleanly via mousemove without 60fps re-render loops
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    setMouseOffset({ x: normX * 25, y: normY * 15 });
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
    setCursorPos({ x: -1000, y: -1000 });
  };

  // Canvas Dust Particles drifting through sunlight beam
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Particle[] = [];
    const particleCount = 45;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles focused around the sunbeam
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.2 + 0.8,
        speedY: -(Math.random() * 0.35 + 0.15),
        speedX: Math.random() * 0.25 - 0.1,
        opacity: Math.random() * 0.6 + 0.2,
        opacityDelta: (Math.random() * 0.008 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity += p.opacityDelta;

        if (p.opacity > 0.85 || p.opacity < 0.15) {
          p.opacityDelta *= -1;
        }

        // Wrap boundaries
        if (p.y < 0) p.y = canvas.height;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;

        // Render warm golden particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle =
          lighting === 'twilight'
            ? `rgba(235, 175, 140, ${p.opacity * 0.8})`
            : lighting === 'noon'
            ? `rgba(255, 235, 205, ${p.opacity})`
            : `rgba(245, 195, 145, ${p.opacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(230, 150, 95, 0.5)';
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [lighting]);

  // Lighting theme color configurations
  const getLightingParams = () => {
    switch (lighting) {
      case 'noon':
        return {
          sky0: '#DE9C78',
          sky1: '#A85938',
          sky2: '#3D1C13',
          far0: '#E8A37E',
          far1: '#B96642',
          far2: '#572619',
          mid0: '#C77651',
          mid1: '#8A3E23',
          mid2: '#2F130B',
          near0: '#AC5D3B',
          near1: '#722F1A',
          near2: '#210B06',
          beam0: '#FFF8EE',
          beam1: '#F4B58A',
          beamOpacity: 0.55,
          portalGlow: '#FDE4CC',
        };
      case 'twilight':
        return {
          sky0: '#9E5542',
          sky1: '#5D2520',
          sky2: '#180B0D',
          far0: '#A4533C',
          far1: '#6E2C22',
          far2: '#2E1110',
          mid0: '#873F2D',
          mid1: '#4F1B16',
          mid2: '#1C0A0B',
          near0: '#6C2B1E',
          near1: '#3D120F',
          near2: '#120507',
          beam0: '#FFD3B0',
          beam1: '#BD593E',
          beamOpacity: 0.35,
          portalGlow: '#F7A779',
        };
      default: // golden hour
        return {
          sky0: '#C47E5A',
          sky1: '#8A482E',
          sky2: '#2D150F',
          far0: '#D98E69',
          far1: '#A25737',
          far2: '#431D14',
          mid0: '#B36846',
          mid1: '#75351E',
          mid2: '#250F0A',
          near0: '#9C5234',
          near1: '#632917',
          near2: '#1C0A06',
          beam0: '#FFF2E0',
          beam1: '#E69865',
          beamOpacity: 0.45,
          portalGlow: '#FAD4B2',
        };
    }
  };

  const colors = getLightingParams();

  if (isCollapsed) {
    return (
      <div className="w-full bg-[#111111] border-b border-[#EEEDEA]/15 px-4 sm:px-8 py-3 sticky top-16 z-30 shadow-md">
        <div className="max-w-[1560px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#E0A37E] animate-pulse shrink-0" />
            <span className="text-[#EEEDEA] font-semibold truncate max-w-[200px] sm:max-w-md">
              {activeEventName || 'PlanCraft AI Planning Assistant'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
            <button
              onClick={() => onSelectTab?.('assistant')}
              className="px-3 py-1 rounded-full bg-[#E0A37E] hover:bg-[#F2CBB2] text-black font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Assistant</span>
            </button>
            <button
              onClick={() => onSelectTab?.('all')}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#EEEDEA] transition cursor-pointer shrink-0"
            >
              Overview
            </button>
            <button
              onClick={() => onSelectTab?.('budget')}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#EEEDEA] transition cursor-pointer shrink-0"
            >
              Budget
            </button>
            <button
              onClick={() => onSelectTab?.('timeline')}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#EEEDEA] transition cursor-pointer shrink-0"
            >
              Milestones
            </button>
            <button
              onClick={() => onSelectTab?.('vendors')}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#EEEDEA] transition cursor-pointer shrink-0"
            >
              Vendors
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="ml-2 px-2.5 py-1 rounded-full border border-white/20 text-[#DCD8D5] hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
              >
                Expand Hero
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full min-h-[92vh] min-h-[92dvh] hero-viewport-container flex flex-col justify-between overflow-hidden bg-[#111111] cursor-default select-none"
    >
      {/* 1. Multi-Plane Interactive SVG Architectural Archways */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          viewBox="0 0 1600 1000"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full object-cover transition-all duration-700 ease-out"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="skyLight" x1="0%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor={colors.sky0} stopOpacity="0.9" />
              <stop offset="40%" stopColor={colors.sky1} stopOpacity="0.95" />
              <stop offset="100%" stopColor={colors.sky2} stopOpacity="1" />
            </linearGradient>

            <linearGradient id="archWallFar" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor={colors.far0} />
              <stop offset="50%" stopColor={colors.far1} />
              <stop offset="100%" stopColor={colors.far2} />
            </linearGradient>

            <linearGradient id="archWallMid" x1="0%" y1="20%" x2="100%" y2="80%">
              <stop offset="0%" stopColor={colors.mid0} />
              <stop offset="60%" stopColor={colors.mid1} />
              <stop offset="100%" stopColor={colors.mid2} />
            </linearGradient>

            <linearGradient id="archWallNear" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor={colors.near0} />
              <stop offset="45%" stopColor={colors.near1} />
              <stop offset="100%" stopColor={colors.near2} />
            </linearGradient>

            <linearGradient id="sunBeam" x1="0%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor={colors.beam0} stopOpacity={colors.beamOpacity} />
              <stop offset="40%" stopColor={colors.beam1} stopOpacity={colors.beamOpacity * 0.5} />
              <stop offset="100%" stopColor="#2A120B" stopOpacity="0" />
            </linearGradient>

            <radialGradient id="portalGlow" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor={colors.portalGlow} stopOpacity="0.85" />
              <stop offset="40%" stopColor={colors.sky1} stopOpacity="0.5" />
              <stop offset="85%" stopColor="#3A170F" stopOpacity="0.95" />
            </radialGradient>
          </defs>

          {/* Layer 0: Sky / Backfield (Parallax depth 0.2) */}
          <g
            style={{
              transform: `translate3d(${mouseOffset.x * 0.15}px, ${mouseOffset.y * 0.15}px, 0)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <rect width="1600" height="1000" fill="url(#skyLight)" />
          </g>

          {/* Layer 1: Radiant Sunlight Beam (Parallax depth 0.35 + breathing pulse) */}
          <g
            style={{
              transform: `translate3d(${mouseOffset.x * 0.25}px, ${mouseOffset.y * 0.2}px, 0)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <polygon points="200,0 650,0 1200,1000 400,1000" fill="url(#sunBeam)" />
          </g>

          {/* Layer 2: Deep Chamber Portal (Parallax depth 0.4) */}
          <g
            style={{
              transform: `translate3d(${mouseOffset.x * 0.35}px, ${mouseOffset.y * 0.3}px, 0)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <path
              d="M 620,1000 L 620,440 C 620,320 700,240 800,240 C 900,240 980,320 980,440 L 980,1000 Z"
              fill="url(#portalGlow)"
            />
          </g>

          {/* Layer 3: Mid-Ground Terracotta Wall & Curved Arch (Parallax depth 0.6) */}
          <g
            style={{
              transform: `translate3d(${mouseOffset.x * 0.6}px, ${mouseOffset.y * 0.5}px, 0)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <path
              d="M 0,1000 L 0,0 L 520,0 L 520,380 C 520,220 640,120 800,120 C 960,120 1080,220 1080,380 L 1080,1000 L 1600,1000 L 1600,0 L 1080,0"
              fill="url(#archWallFar)"
              opacity="0.96"
            />
          </g>

          {/* Layer 4: Sculptural Middle Arch (Parallax depth 0.85) */}
          <g
            style={{
              transform: `translate3d(${mouseOffset.x * 0.85}px, ${mouseOffset.y * 0.7}px, 0)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <path
              d="M 0,1000 L 0,0 L 400,0 L 400,420 C 400,180 580,40 800,40 C 1020,40 1200,180 1200,420 L 1200,1000 L 1600,1000 L 1600,0 L 0,0 Z"
              fill="url(#archWallMid)"
            />
          </g>

          {/* Layer 5: Near Monolithic Pillars (Parallax depth 1.15) */}
          <g
            style={{
              transform: `translate3d(${mouseOffset.x * 1.15}px, ${mouseOffset.y * 0.9}px, 0)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <path
              d="M 0,1000 L 0,0 L 260,0 L 260,540 C 260,260 480,140 800,140 C 1120,140 1340,260 1340,540 L 1340,1000 L 1600,1000 L 1600,1000 Z"
              fill="url(#archWallNear)"
              opacity="0.9"
            />
          </g>

          {/* Base Floor Perspective Grid */}
          <rect y="820" width="1600" height="180" fill="#200B06" opacity="0.9" />
          <line x1="0" y1="820" x2="1600" y2="820" stroke="#7A3922" strokeWidth="2" opacity="0.4" />
          <line x1="260" y1="820" x2="500" y2="1000" stroke="#8F462C" strokeWidth="1.5" opacity="0.3" />
          <line x1="1340" y1="820" x2="1100" y2="1000" stroke="#8F462C" strokeWidth="1.5" opacity="0.3" />
        </svg>

        {/* 2. Interactive Ambient Cursor Spotlight */}
        {cursorPos.x > 0 && (
          <div
            className="absolute rounded-full pointer-events-none transition-opacity duration-300"
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              width: '450px',
              height: '450px',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(255, 210, 160, 0.12) 0%, rgba(200, 110, 60, 0.05) 50%, transparent 75%)',
            }}
          />
        )}

        {/* 3. Floating Sunbeam Particles Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* 4. Spec-defined Scrims */}
        <div className="absolute inset-0 hero-radial-scrim pointer-events-none" />
        <div className="absolute inset-0 hero-fade-scrim pointer-events-none" />
      </div>

      {/* Top spacer for glass navbar */}
      <div className="h-20" />

      {/* Hero Content Block with subtle interactive float */}
      <div className="relative z-10 max-w-[1560px] mx-auto px-6 sm:px-10 lg:px-16 w-full py-16 sm:py-20 flex flex-col items-center text-center">
        {/* Eyebrow & Interactive Lighting Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEEDEA]/15 backdrop-blur-md border border-[#EBF0EB]/20 text-[#EEEDEA] text-xs font-medium tracking-wide shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#E0A37E] animate-pulse" />
            <span>Antigravity GenAI Event Operating System</span>
          </div>

          {/* Interactive Architectural Lighting Mode Controls */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs">
            <button
              onClick={() => setLighting('golden')}
              className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition ${
                lighting === 'golden'
                  ? 'bg-[#E0A37E] text-black font-semibold'
                  : 'text-[#DCD8D5]/70 hover:text-white'
              }`}
              title="Golden Hour Light"
            >
              <Sunrise className="w-3 h-3" />
              <span className="hidden sm:inline">Golden Hour</span>
            </button>

            <button
              onClick={() => setLighting('noon')}
              className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition ${
                lighting === 'noon'
                  ? 'bg-[#E0A37E] text-black font-semibold'
                  : 'text-[#DCD8D5]/70 hover:text-white'
              }`}
              title="Midday High Noon Light"
            >
              <Sun className="w-3 h-3" />
              <span className="hidden sm:inline">High Noon</span>
            </button>

            <button
              onClick={() => setLighting('twilight')}
              className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition ${
                lighting === 'twilight'
                  ? 'bg-[#E0A37E] text-black font-semibold'
                  : 'text-[#DCD8D5]/70 hover:text-white'
              }`}
              title="Twilight Amber Mood"
            >
              <Sunset className="w-3 h-3" />
              <span className="hidden sm:inline">Twilight</span>
            </button>
          </div>
        </div>

        {/* Display Headline with Signature Lora Italic Interruption */}
        <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-medium text-[#EEEDEA] tracking-[-2.5px] leading-[1.08] max-w-4xl text-balance">
          Orchestrate <span className="accent-serif text-[#F2CBB2] hover:text-[#FFF] transition-colors duration-300">bespoke</span> gatherings with live constraint intelligence.
        </h1>

        {/* Supporting Paragraph */}
        <p className="mt-6 text-base sm:text-lg text-[#DCD8D5] max-w-2xl font-normal leading-relaxed text-balance">
          Every budget allocation, timeline milestone, and vendor tier is mutually unified in a single AI inference pass. Modify a constraint, and the system replans affected sections in real time.
        </p>


        {/* Hero Button Pair */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
          <button
            onClick={() => onSelectTab?.('assistant')}
            className="h-[43px] px-6 py-2.5 bg-[#E0A37E] text-black hover:bg-[#F2CBB2] rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 flex items-center gap-2 shadow-2xl hover:scale-105 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>✦ Ask AI Planning Assistant</span>
          </button>

          <button
            onClick={() => (onScrollToWorkspace ? onScrollToWorkspace() : onSelectTab?.('all'))}
            className="h-[43px] px-5 py-2.5 bg-[#EEEDEA] text-[#111111] hover:bg-white rounded-full font-medium text-sm transition-all duration-200 active:scale-95 flex items-center gap-2 shadow-xl hover:scale-105 cursor-pointer"
          >
            <ArrowDown className="w-4 h-4 text-[#E0A37E]" />
            <span>Open Planner Workspace</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="h-[43px] px-5 py-2.5 bg-[#111111] text-[#DCD8D5] hover:text-white rounded-full border border-[#333333] font-medium text-sm transition-all duration-200 active:scale-95 flex items-center gap-2 shadow-xl hover:bg-black cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#DCD8D5]" />
            <span>New Event</span>
          </button>

          {hasActiveEvent && (
            <button
              onClick={onOpenReplan}
              className="h-[43px] px-5 py-2.5 rounded-full bg-transparent hover:bg-white/10 text-[#EEEDEA] border border-[#EEEDEA]/40 font-medium text-sm transition-all duration-200 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#E0A37E]" />
              <span>Edit Constraints</span>
            </button>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="h-[43px] px-4 py-2.5 rounded-full border border-white/20 text-[#DCD8D5] hover:text-white hover:bg-white/10 transition text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              title="Minimize hero to focus directly on workspace"
            >
              <span>Minimize Hero</span>
            </button>
          )}
        </div>

        {/* Quick-Jump Section Navigator */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-xs">
          <span className="text-[#DCD8D5]/60 mr-1 font-medium hidden sm:inline">Jump straight to:</span>
          <button
            onClick={() => onSelectTab?.('assistant')}
            className="px-3.5 py-1.5 rounded-full bg-[#E0A37E] hover:bg-[#F2CBB2] text-black font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>AI Planning Assistant</span>
          </button>
          <button
            onClick={() => onSelectTab?.('all')}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#EEEDEA] border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer hover:border-[#E0A37E]/50"
          >
            <ArrowDown className="w-3.5 h-3.5 text-[#E0A37E]" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => onSelectTab?.('budget')}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#EEEDEA] border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer hover:border-[#E0A37E]/50"
          >
            <DollarSign className="w-3.5 h-3.5 text-[#E0A37E]" />
            <span>Budget Breakdown</span>
          </button>
          <button
            onClick={() => onSelectTab?.('timeline')}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#EEEDEA] border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer hover:border-[#E0A37E]/50"
          >
            <Calendar className="w-3.5 h-3.5 text-[#E0A37E]" />
            <span>Milestone Timeline</span>
          </button>
          <button
            onClick={() => onSelectTab?.('vendors')}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#EEEDEA] border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer hover:border-[#E0A37E]/50"
          >
            <Store className="w-3.5 h-3.5 text-[#E0A37E]" />
            <span>Vendors</span>
          </button>
          <button
            onClick={() => onSelectTab?.('ideas')}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#EEEDEA] border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer hover:border-[#E0A37E]/50"
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#E0A37E]" />
            <span>Concepts</span>
          </button>
        </div>
      </div>

      {/* Stat Row */}
      <div className="relative z-10 w-full border-t border-[#EEEDEA]/15 bg-[#111111]/70 backdrop-blur-md">
        <div className="max-w-[1560px] mx-auto px-6 sm:px-10 lg:px-16 py-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="group">
            <div className="text-3xl sm:text-4xl font-medium tracking-[-1px] text-[#EEEDEA] tabular-nums group-hover:text-[#E0A37E] transition-colors">
              100%
            </div>
            <div className="text-xs text-[#DCD8D5] mt-1 font-medium tracking-wide">
              Mutual Arithmetic Consistency
            </div>
          </div>

          <div className="group">
            <div className="text-3xl sm:text-4xl font-medium tracking-[-1px] text-[#EEEDEA] tabular-nums group-hover:text-[#E0A37E] transition-colors">
              1 Pass
            </div>
            <div className="text-xs text-[#DCD8D5] mt-1 font-medium tracking-wide">
              Unified Single LLM Generation
            </div>
          </div>

          <div className="group">
            <div className="text-3xl sm:text-4xl font-medium tracking-[-1px] text-[#EEEDEA] tabular-nums group-hover:text-[#E0A37E] transition-colors">
              &lt; 2.5s
            </div>
            <div className="text-xs text-[#DCD8D5] mt-1 font-medium tracking-wide">
              Constraint-Aware Replan Latency
            </div>
          </div>

          <div className="group">
            <div className="text-3xl sm:text-4xl font-medium tracking-[-1px] text-[#EEEDEA] tabular-nums group-hover:text-[#E0A37E] transition-colors">
              Zero
            </div>
            <div className="text-xs text-[#DCD8D5] mt-1 font-medium tracking-wide">
              Hardcoded Static Templates
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
