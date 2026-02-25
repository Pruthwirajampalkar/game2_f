import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';

// Connect to backend (automatically connects to same host in production)
const socketUrl = import.meta.env.PROD ? '/' : 'http://localhost:3001';
const socket = io(socketUrl);

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-900 text-gray-100 font-sans flex flex-col">
        {/* Hide header on mobile if in room */}
        <header className="hidden md:flex p-4 border-b border-dark-800 justify-between items-center bg-dark-900 shadow-md">
          <div className="flex items-center gap-2">
            <div className="px-4 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-emerald-400 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl tracking-tight">SketchClue</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-none ${isConnected ? 'bg-primary-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-sm font-medium text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </header>

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
          <Routes>
            <Route path="/" element={<Home socket={socket} />} />
            <Route path="/room/:roomId" element={<Room socket={socket} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
