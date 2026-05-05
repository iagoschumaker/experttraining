import React from 'react';
import { createRoot } from 'react-dom/client';
import Model from 'react-body-highlighter';

const App = () => {
  const data = [
    { name: 'Peitoral', muscles: ['chest'] },
    { name: 'Braço', muscles: ['biceps', 'triceps'] }
  ];
  return (
    <div style={{ padding: '20px', background: '#222', color: 'white' }}>
      <h1>Model Test</h1>
      <Model data={data} bodyColor="#333" highlightedColors={["#3b82f6"]} />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
