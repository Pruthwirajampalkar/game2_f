import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, Users, Play } from 'lucide-react';
import Avatar from '../components/Avatar';

export default function Home({ socket }) {
    const [username, setUsername] = useState('');
    // If user got redirected from Room because they didn't have a username, we can pull the room ID from the path if we want, or from history state. 
    // We will pull the pathname to see if they tried to access a room directly
    const tempStoredRoomId = window.location.pathname.startsWith('/room/') ? window.location.pathname.split('/')[2] : '';
    const [roomId, setRoomId] = useState(tempStoredRoomId || '');
    const [selectedAvatar] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if (username.trim() && roomId.trim()) {
            navigate(`/room/${roomId.trim()}`, { state: { username: username.trim(), avatar: selectedAvatar } });
        }
    };

    const generateRoomId = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (username.trim()) {
            const newRoom = generateRoomId();
            navigate(`/room/${newRoom}`, { state: { username: username.trim(), avatar: selectedAvatar } });
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-4 min-h-screen relative overflow-hidden bg-dark-900">
            {/* Animated Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/30 rounded-none blur-[120px] mix-blend-screen animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-600/30 rounded-none blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-indigo-500/20 rounded-none blur-[100px] mix-blend-screen"></div>

            <div className="max-w-md w-full backdrop-blur-xl bg-dark-800/40 p-8 rounded-none shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] border border-white/10 relative z-10 transform transition-all duration-500 hover:scale-[1.01]">

                <div className="text-center mb-6 relative z-10">
                    <div className="w-24 h-24 mx-auto flex items-center justify-center mb-4 transform transition-transform hover:scale-105">
                        <Avatar seed={selectedAvatar} size={96} />
                    </div>
                    <h2 className="text-3xl font-extrabold text-white mb-2">Welcome Back!</h2>
                </div>

                <form className="space-y-6 relative z-10">


                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Nickname</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-none text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                            placeholder="Enter your cool name..."
                        />
                    </div>

                    <div className="flex flex-col gap-4 pt-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                className="flex-1 px-4 py-3 bg-dark-900 border border-dark-600 rounded-none text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                placeholder="Room Code"
                            />
                            <button
                                onClick={handleJoin}
                                disabled={!username.trim() || !roomId.trim()}
                                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-none font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Users size={18} /> Join
                            </button>
                        </div>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-dark-700"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">Or create new</span>
                            <div className="flex-grow border-t border-dark-700"></div>
                        </div>

                        <button
                            onClick={handleCreateRoom}
                            disabled={!username.trim()}
                            className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-emerald-500 hover:from-primary-600 hover:to-emerald-600 text-white rounded-none font-bold shadow-lg shadow-primary-500/25 transition-all transform hover:-translate-y-1 focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group"
                        >
                            <Play size={18} className="group-hover:animate-pulse" /> Create Private Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
