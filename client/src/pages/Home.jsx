import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Zap, Pencil, Eye } from 'lucide-react';
import Avatar from '../components/Avatar';

export default function Home({ socket }) {
    const [username, setUsername] = useState('');
    const tempStoredRoomId = window.location.pathname.startsWith('/room/')
        ? window.location.pathname.split('/')[2] : '';
    const [roomId, setRoomId] = useState(tempStoredRoomId || '');
    const [selectedAvatar] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if (username.trim() && roomId.trim()) {
            navigate(`/room/${roomId.trim()}`, { state: { username: username.trim(), avatar: selectedAvatar } });
        }
    };

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (username.trim()) {
            const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
            navigate(`/room/${newRoom}`, { state: { username: username.trim(), avatar: selectedAvatar } });
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background glow blobs */}
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary-600/20 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/20 rounded-full blur-[140px] pointer-events-none" />

            {/* Logo / Header */}
            <div className="mb-10 text-center relative z-10">
                <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                        <Pencil size={24} className="text-white" />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tight">
                        Sketch<span className="text-primary-400">Clue</span>
                    </h1>
                </div>
                <p className="text-gray-400 text-lg">Draw. Guess. Win!</p>
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-md bg-dark-800/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">

                {/* Avatar preview */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <Avatar seed={selectedAvatar} size={88} />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-500 rounded-lg flex items-center justify-center">
                            <div className="w-2 h-2 bg-white animate-pulse" />
                        </div>
                    </div>
                </div>

                <form className="space-y-4">
                    {/* Username */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Your Nickname</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-900/80 border border-dark-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/60 transition-all"
                            placeholder="Enter your name..."
                            maxLength={20}
                        />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-dark-700" />
                        <span className="text-xs text-gray-500 font-medium">JOIN OR CREATE</span>
                        <div className="flex-1 h-px bg-dark-700" />
                    </div>

                    {/* Room code + Join */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            className="flex-1 px-4 py-3 bg-dark-900/80 border border-dark-700 rounded-xl text-white placeholder-gray-600 font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/60 transition-all uppercase"
                            placeholder="ROOM CODE"
                            maxLength={8}
                        />
                        <button
                            onClick={handleJoin}
                            disabled={!username.trim() || !roomId.trim()}
                            className="px-5 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 border border-dark-600 hover:border-dark-500"
                        >
                            <Users size={16} />
                            Join
                        </button>
                    </div>

                    {/* Create Room */}
                    <button
                        onClick={handleCreateRoom}
                        disabled={!username.trim()}
                        className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-emerald-500 hover:from-primary-400 hover:to-emerald-400 text-white rounded-xl font-bold text-base shadow-lg shadow-primary-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                        <Zap size={18} />
                        Create New Room
                    </button>
                </form>

                {/* How to play */}
                <div className="mt-6 pt-5 border-t border-dark-700/60 flex justify-center gap-8">
                    {[
                        { icon: Pencil, label: 'Draw' },
                        { icon: Eye, label: 'Guess' },
                        { icon: Zap, label: 'Score' },
                    ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex flex-col items-center gap-2">
                            <div className="w-9 h-9 bg-dark-700 rounded-xl flex items-center justify-center">
                                <Icon size={16} className="text-primary-400" />
                            </div>
                            <p className="text-white text-xs font-bold">{label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
