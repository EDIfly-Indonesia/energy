// src/App.tsx
import React from 'react';
import { AppRoutes } from './routes';
import { Agentation } from "agentation";

const App: React.FC = () => {
  return (
    <div id="app" className="min-h-screen bg-gray-50 dark:bg-scada-bg text-gray-900 dark:text-scada-text">
      <AppRoutes />
      <Agentation />
    </div>
  );
};

export default App;
