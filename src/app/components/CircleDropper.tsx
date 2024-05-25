// src/app/components/CircleDropper.tsx
"use client";
import React, { useRef, useEffect } from 'react';
import p5 from 'p5';
import { setup, draw, windowResized, checkScroll } from './CircleDropperUtils';
import { Particle } from './Particle';

const CircleDropper: React.FC = () => {
  const particles = useRef<Particle[]>([]);
  const lastScrollY = useRef<number>(0);
  const lastAddTime = useRef<number>(0);
  const addInterval = 200; // milliseconds
  const maxParticles = 100;
  const isScrolling = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      lastScrollY.current = window.scrollY;

      const Sketch = (p: p5) => {
        p.setup = () => setup(p, particles.current, () => checkScroll(p, particles.current, lastScrollY.current, lastAddTime.current, addInterval, maxParticles, isScrolling.current));
        p.draw = () => draw(p, particles.current);
        p.windowResized = () => windowResized(p);
      };

      const canvas = new p5(Sketch);
      
      const handleResize = () => windowResized(canvas);
      window.addEventListener('resize', handleResize);
      
      return () => {
        canvas.remove();
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return <div id="canvas-container" />;
};

export default CircleDropper;