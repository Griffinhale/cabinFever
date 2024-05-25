"use client";
import { useEffect, useState, useRef } from 'react';
import { Engine, Render, World, Bodies, Body, Runner } from 'matter-js';

type Circle = {
  id: number;
  body: Body;
  size: number;
  color: string;
};

const CircleDropper = ({ children }: any) => {
  const [circles, setCircles] = useState<Circle[]>([]);
  const scene = useRef<HTMLDivElement>(null);
  const engine = useRef(Engine.create());
  const runner = useRef(Runner.create());

  useEffect(() => {
    const { current: engineInstance } = engine;
    const { current: runnerInstance } = runner;

    const render = Render.create({
      element: scene.current as HTMLElement,
      engine: engineInstance,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'white',
      },
    });

    Render.run(render);
    Runner.run(runnerInstance, engineInstance);

    console.log('Render setup:', render);

    const wallOptions = { isStatic: true };
    const walls = [
      Bodies.rectangle(window.innerWidth / 2, -10, window.innerWidth, 20, wallOptions),
      Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 10, window.innerWidth, 20, wallOptions),
      Bodies.rectangle(-10, window.innerHeight / 2, 20, window.innerHeight, wallOptions),
      Bodies.rectangle(window.innerWidth + 10, window.innerHeight / 2, 20, window.innerHeight, wallOptions),
    ];
    World.add(engineInstance.world, walls);

    console.log('Walls added:', walls);

    const handleScroll = () => {
      const newScrollPosition = window.scrollY;

      if (newScrollPosition > scrollPositionRef.current) {
        addCircle();
      } else {
        removeCircle();
      }

      scrollPositionRef.current = newScrollPosition;
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      Render.stop(render);
      World.clear(engineInstance.world, true);
      Engine.clear(engineInstance);
      Runner.stop(runnerInstance);
    };
  }, []);

  const scrollPositionRef = useRef(0);

  const addCircle = () => {
    const size = Math.random() * 50 + 10;
    const x = Math.random() * (window.innerWidth - size);
    const y = Math.random() * (window.innerHeight - size);
    const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    const newCircle = Bodies.circle(x, y, size / 2, {
      restitution: 0.8,
      render: { fillStyle: color },
    });

    console.log('Adding circle:', { x, y, size, color });

    World.add(engine.current.world, newCircle);

    setCircles((prevCircles) => [
      ...prevCircles,
      { id: Date.now(), body: newCircle, size, color },
    ]);
  };

  const removeCircle = () => {
    if (circles.length > 0) {
      const { body } = circles[circles.length - 1];
      World.remove(engine.current.world, body);
      setCircles((prevCircles) => prevCircles.slice(0, -1));
    }
  };

  return (
    <div className="relative">
      <div
        ref={scene}
        className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default CircleDropper;