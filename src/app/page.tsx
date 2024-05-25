// src/app/page.tsx
import React from 'react';
import dynamic from 'next/dynamic'

const CircleDropper = dynamic(
  () => import('./components/CircleDropper'),
  { ssr: false }
)
const Page: React.FC = () => {
  return (
    <div id="main-content">
      <CircleDropper />
      <header>
        <h1>My Portfolio</h1>
      </header>
      <div style={{ height: '8000px' }}>
        <p>Scroll to see more content...</p>
        {/* Add more content here */}
      </div>
    </div>
  );
};

export default Page;