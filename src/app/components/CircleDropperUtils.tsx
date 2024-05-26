// src/app/components/CircleDropperUtils.tsx
import { Particle } from './Particle';
import p5 from 'p5';

export const setup = (p: p5, particles: Particle[], checkScroll: () => void) => {
  p.createCanvas(p.windowWidth, p.windowHeight);
  p.noStroke();
  window.requestAnimationFrame(checkScroll);
};

export const draw = (p: p5, particles: Particle[]) => {
  p.background(255);

  // Loop through particles to update and display them
  for (let i = particles.length - 1; i >= 0; i--) {
    let particle = particles[i];
    particle.display(p);
    particle.update(p);

    // Remove particles that are too small
    if (particle.size <= 0) {
      particles.splice(i, 1);
    }
  }

  // Loop through particles to check for collisions
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      let p1 = particles[i];
      let p2 = particles[j];
      if (p1.intersects(p2)) {
      // Check and handle collision
      p1.handleCollision(p2, p);
      }
    }
  }
};

export const windowResized = (p: p5) => {
  p.resizeCanvas(p.windowWidth, p.windowHeight);
};

export const checkScroll = (
  p: p5,
  particles: Particle[],
  lastScrollY: number,
  lastAddTime: number,
  addInterval: number,
  maxParticles: number,
  isScrolling: boolean
) => {
  let currentScrollY = window.scrollY;

  if (currentScrollY < lastScrollY) {
    for (let particle of particles) {
      particle.startShrinking();
    }
  } else if (currentScrollY > lastScrollY) {
    if (particles.length < maxParticles && p.millis() - lastAddTime > addInterval) {
      particles.push(new Particle(p.random(p.width), p.random(p.height), p));
      lastAddTime = p.millis();
    }
    for (let particle of particles) {
      particle.stopShrinking();
    }
  } else if (currentScrollY == lastScrollY){
    isScrolling = false;
  }

  lastScrollY = currentScrollY;
  window.requestAnimationFrame(() => checkScroll(p, particles, lastScrollY, lastAddTime, addInterval, maxParticles, isScrolling));
};