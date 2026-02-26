import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import { Users, Crown, Trophy, Play, Palette, Copy, Check, Settings } from 'lucide-react';
import Avatar from '../components/Avatar';

export default function Room({ socket }) {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [roomData, setRoomData] = useState(null);
    const [wordOptions, setWordOptions] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [gameOverData, setGameOverData] = useState(null);
    const [roundOverData, setRoundOverData] = useState(null);
    const username = location.state?.username;
    const avatar = location.state?.avatar || 'Felix';
    const [copied, setCopied] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showMobileLobby, setShowMobileLobby] = useState(false);

    useEffect(() => {
        if (!username) {
            navigate('/');
            return;
        }

        socket.emit('join_room', { username, avatar, roomId });

        socket.on('room_update', (data) => {
            setRoomData(data);
        });

        socket.on('room_error', (msg) => {
            alert(msg);
            navigate('/');
        });

        socket.on('timer_update', (time) => {
            setTimeLeft(time);
        });

        socket.on('choose_word_options', (options) => {
            setWordOptions(options);
            setGameOverData(null);
            setRoundOverData(null);
        });

        socket.on('game_started', () => {
            setWordOptions([]);
            setRoundOverData(null);
        });

        socket.on('round_ended', (data) => {
            setWordOptions([]);
            setRoundOverData(data);
        });

        socket.on('game_over', (data) => {
            setGameOverData(data);
            setWordOptions([]);
            setRoundOverData(null);
        });

        return () => {
            socket.off('room_update');
            socket.off('timer_update');
            socket.off('choose_word_options');
            socket.off('game_started');
            socket.off('round_ended');
            socket.off('game_over');
            socket.off('room_error');
        };
    }, [socket, username, navigate]);

    const handleStartGame = () => {
        socket.emit('start_game', roomId);
    };

    const handleSelectWord = (word) => {
        socket.emit('word_chosen', { roomId, word });
    };

    const handleKickPlayer = (targetId) => {
        if (window.confirm('Are you sure you want to kick this player?')) {
            socket.emit('kick_player', { roomId, targetId });
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/room/${roomId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!roomData) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-none h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const isDrawer = roomData.currentDrawer === socket.id;
    // If no one is currentDrawer yet and we are lobby... Wait, drawer ID vs socket ID
    // socket.id is local state. 

    return (
        <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 p-2 md:p-6 max-w-[1600px] mx-auto w-full h-[100dvh] md:h-[calc(100vh-80px)]">
            {/* Mobile Players Toggle */}
            <div className="md:hidden flex flex-col gap-2 bg-dark-800/80 backdrop-blur rounded-none p-3 border border-dark-600">
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => setShowMobileLobby(!showMobileLobby)}
                        className="flex items-center gap-2 font-bold text-white bg-dark-900 px-4 py-2 rounded-none border border-dark-700 hover:border-primary-500 transition-colors"
                    >
                        <Users size={18} className="text-primary-400" />
                        Players ({roomData.players.length})
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-400 transition-colors"
                        title="Copy Invite Link"
                    >
                        Code: {roomId}
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-500" />}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <Crown size={18} className="text-yellow-400" />
                    <span className="font-bold text-white">{roomData.players.find(p => p.id === socket.id)?.score || 0} pts</span>
                </div>
            </div>

            {/* Left Sidebar - Players & Leaderboard */}
            <div className={`${showMobileLobby ? 'flex' : 'hidden'} md:flex w-full md:w-72 flex-col gap-4 shrink-0 h-48 md:h-auto md:self-stretch`}>
                <div className="bg-dark-800/60 backdrop-blur-xl rounded-none p-4 md:p-5 border border-white/10 shadow-2xl flex-1 flex flex-col overflow-hidden transition-all duration-300 hover:border-white/20">
                    <div className="hidden md:flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                        <div className="p-2 bg-primary-500/20 rounded-none">
                            <Users className="text-primary-400" size={24} />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg leading-tight">Lobby</h2>
                            <p className="text-xs text-primary-400 font-medium tracking-wider uppercase">Room: {roomId}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {[...roomData.players].sort((a, b) => b.score - a.score).map((player, index) => (
                            <div
                                key={player.id}
                                className={`flex items-center gap-3 p-3 transition-colors ${player.id === socket.id ? 'text-primary-400' : 'text-white'} ${roomData.guessedPlayers?.includes(player.id) ? 'border-l-4 border-l-green-500' : ''}`}
                            >
                                <div className="relative shrink-0 transition-transform duration-300 transform group-hover:scale-110">
                                    <Avatar seed={player.avatar || player.username} emotion={player.emotion} size={48} className={player.emotion === 'happy' ? 'animate-bounce' : ''} />
                                    {player.id === roomData.currentDrawer && (
                                        <div className="absolute -bottom-1 -right-1 bg-primary-500 text-white p-1 rounded-none shadow-lg">
                                            <Palette size={12} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                                        {player.username}
                                        {player.id === socket.id && <span className="text-xs text-primary-400 font-normal">(You)</span>}
                                        {roomData.players[0]?.id === player.id && <span className="text-[10px] text-red-500 uppercase tracking-wider font-bold">Host</span>}
                                    </p>
                                    <p className="text-xs text-gray-400 font-medium">{player.score} pts</p>
                                </div>
                                {index === 0 && player.score > 0 && <Crown size={16} className="text-yellow-400 drop-shadow-md" />}

                                {roomData.players[0]?.id === socket.id && player.id !== socket.id && (
                                    <button
                                        onClick={() => handleKickPlayer(player.id)}
                                        title="Kick player"
                                        className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-none transition-colors border border-red-500/20 hover:border-red-500"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>



                    {roomData.status === 'lobby' && roomData.players.length > 0 && roomData.players[0].id === socket.id && (
                        <button
                            onClick={handleStartGame}
                            className="mt-4 w-full py-3 bg-gradient-to-r from-primary-500 to-emerald-500 hover:from-primary-600 hover:to-emerald-600 text-white rounded-none font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 transition-transform hover:-translate-y-1"
                        >
                            <Play size={18} /> Start Game
                        </button>
                    )}
                    {roomData.status === 'lobby' && roomData.players.length < 1 && (
                        <div className="mt-4 p-3 bg-dark-700/50 rounded-none text-center text-sm text-gray-400 border border-dark-600">
                            Waiting for players to join...
                        </div>
                    )}
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 flex flex-col bg-dark-800 rounded-none border border-dark-700 shadow-xl overflow-hidden relative">

                {/* Top bar for words / hints / timer / link */}
                <div className="h-14 border-b border-dark-700 bg-dark-800/80 backdrop-blur top-0 flex items-center justify-between px-6 relative z-10 w-full">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-primary-400 border border-primary-500/30 bg-primary-500/10 px-3 py-1 rounded-none">Round {roomData.round || 1} / {roomData.maxRounds || 3}</span>
                        <div className="hidden md:flex items-center gap-2 bg-dark-900 border border-dark-600 rounded-none px-3 py-1.5 ml-2 group cursor-pointer hover:border-primary-500 transition-colors" onClick={handleCopyLink} title="Copy Invite Link">
                            <span className="text-xs font-bold text-gray-400 group-hover:text-primary-400 transition-colors">Code: {roomId}</span>
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-500 group-hover:text-primary-400 transition-colors" />}
                        </div>

                        {roomData.status === 'lobby' && (
                            <div className="relative ml-2 flex items-center">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="p-1.5 hover:bg-white/10 rounded-none transition-colors text-gray-400 hover:text-white"
                                    title="Room Settings"
                                >
                                    <Settings size={18} />
                                </button>

                                {showSettings && (
                                    <div className="absolute left-0 top-10 w-48 bg-dark-800 border border-dark-600 rounded-none shadow-2xl p-3 z-50">
                                        <h3 className="text-xs font-bold text-gray-300 uppercase mb-2 flex justify-between items-center">
                                            Settings
                                            {roomData.players[0]?.id === socket.id && <span className="text-[9px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded-none">Host</span>}
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400">Rounds</span>
                                                <select
                                                    className="bg-dark-900 border border-dark-700 rounded-none text-white px-1 py-0.5 text-xs outline-none disabled:opacity-50"
                                                    value={roomData.maxRounds || 3}
                                                    onChange={e => {
                                                        socket.emit('update_settings', { roomId, settings: { maxRounds: parseInt(e.target.value) } });
                                                        setShowSettings(false);
                                                    }}
                                                    disabled={roomData.players[0]?.id !== socket.id}
                                                >
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                    <option value="5">5</option>
                                                    <option value="8">8</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400">Time (s)</span>
                                                <select
                                                    className="bg-dark-900 border border-dark-700 rounded-none text-white px-1 py-0.5 text-xs outline-none disabled:opacity-50"
                                                    value={roomData.turnTime || 60}
                                                    onChange={e => {
                                                        socket.emit('update_settings', { roomId, settings: { turnTime: parseInt(e.target.value) } });
                                                        setShowSettings(false);
                                                    }}
                                                    disabled={roomData.players[0]?.id !== socket.id}
                                                >
                                                    <option value="30">30</option>
                                                    <option value="45">45</option>
                                                    <option value="60">60</option>
                                                    <option value="90">90</option>
                                                    <option value="120">120</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex justify-center">
                        {roomData.status === 'playing' ? (
                            isDrawer ? (
                                <div className="text-center flex items-center justify-center">
                                    <span className="text-gray-400 text-sm mr-2">Draw this:</span>
                                    <span className="font-mono text-xl font-black text-white tracking-widest uppercase bg-dark-900 px-4 py-1 rounded-none border border-dark-600 flex items-center gap-3">
                                        <span>{roomData.currentWord}</span>
                                        <span className="text-sm text-primary-400 tracking-normal border-l border-dark-700 pl-3">
                                            ({roomData.currentWord ? (roomData.currentWord.match(/[a-zA-Z]/g) || []).length : 0})
                                        </span>
                                    </span>
                                </div>
                            ) : (
                                <div className="text-center flex items-center justify-center">
                                    <span className="text-gray-400 text-sm mr-2">Guess the word:</span>
                                    <HintDisplay socket={socket} />
                                </div>
                            )
                        ) : roomData.status === 'choosing_word' ? (
                            <div className="text-center text-primary-400 font-bold animate-pulse">
                                {isDrawer ? 'Pick a word quickly!' : `${roomData.players.find(p => p.id === roomData.currentDrawer)?.username || 'Drawer'} is choosing a word...`}
                            </div>
                        ) : roomData.status === 'round_end' ? (
                            <div className="text-xl font-bold text-primary-400 flex items-center gap-2 animate-bounce">
                                <Trophy size={20} className="text-yellow-400" />
                                The word was <span className="text-white uppercase px-2 bg-dark-900 rounded-none border border-dark-600 ml-1">{roomData.currentWord}</span>
                            </div>
                        ) : roomData.status === 'game_over' ? (
                            <div className="text-xl font-bold text-red-400 uppercase tracking-widest">
                                Game Over
                            </div>
                        ) : (
                            <div className="text-gray-500 font-medium">Waiting to start...</div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {(roomData.status === 'playing' || roomData.status === 'choosing_word') && (
                            <div className={`font-mono text-lg md:text-xl font-bold px-2 md:px-3 py-1 rounded-none border ${timeLeft <= 10 ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-pulse' : 'bg-dark-900 text-primary-400 border-dark-600'}`}>
                                ⏱ {timeLeft}s
                            </div>
                        )}
                    </div>
                </div>

                {/* Game Over Overlay */}
                {gameOverData && (
                    <div className="absolute inset-0 z-50 bg-dark-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
                        <Trophy size={80} className="text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce" />
                        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Match Finished!</h2>

                        <div className="bg-dark-800 border border-dark-600 rounded-none p-8 max-w-lg w-full mt-8 shadow-2xl">
                            <h3 className="text-xl font-bold text-gray-400 text-center mb-6 uppercase tracking-widest">Final Leaderboard</h3>
                            <div className="space-y-4">
                                {[...roomData.players].sort((a, b) => b.score - a.score).map((p, idx) => (
                                    <div key={p.id} className={`flex items-center justify-between p-4 rounded-none ${idx === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/30' : 'bg-dark-900 border border-dark-700'}`}>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-2xl font-black ${idx === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{idx + 1}</span>
                                            <span className="font-bold text-lg text-white">{p.username}</span>
                                        </div>
                                        <span className={`font-mono text-xl ${idx === 0 ? 'text-yellow-400 font-bold' : 'text-primary-400'}`}>{p.score} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="mt-8 text-gray-500 text-sm">Returning to lobby in a few seconds...</p>
                    </div>
                )}

                {/* Round Over Overlay */}
                {roundOverData && roomData.status === 'round_end' && !gameOverData && (
                    <div className="absolute inset-0 z-50 bg-dark-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Round Finished!</h2>
                        <div className="text-xl font-bold text-primary-400 flex items-center gap-2 mb-8">
                            The word was <span className="text-white uppercase px-3 py-1 bg-dark-800 rounded-none border border-dark-600 ml-1">{roundOverData.word}</span>
                        </div>

                        <div className="bg-dark-800 border border-dark-600 rounded-none p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-sm font-bold text-gray-400 text-center mb-4 uppercase tracking-widest">Current Scores</h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                {[...roundOverData.players].sort((a, b) => b.score - a.score).map((p, idx) => (
                                    <div key={p.id} className={`flex items-center justify-between p-3 rounded-none ${p.guessed ? 'bg-green-500/10 border border-green-500/30' : 'bg-dark-900 border border-dark-700'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-lg font-black ${idx === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{idx + 1}</span>
                                            <span className="font-bold text-white">{p.username}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {p.guessed && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-none font-bold uppercase tracking-wider">Guessed</span>}
                                            <span className="font-mono font-bold text-primary-400">{p.score} pts</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Word Selection Overlay */}
                {wordOptions.length > 0 && roomData.status === 'choosing_word' && (
                    <div className="absolute inset-0 z-50 bg-dark-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
                        <h3 className="text-3xl font-black text-white mb-4">
                            {isDrawer ? 'Choose a word to draw' : `${roomData.players.find(p => p.id === roomData.currentDrawer)?.username || 'Drawer'} is choosing a word...`}
                        </h3>
                        <p className={`text-xl font-bold mb-8 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-primary-400'}`}>
                            {timeLeft} seconds left!
                        </p>
                        <div className="flex gap-4 max-w-2xl w-full justify-center flex-wrap">
                            {wordOptions.map(w => (
                                <button
                                    key={w}
                                    onClick={() => isDrawer && handleSelectWord(w)}
                                    disabled={!isDrawer}
                                    className={`px-6 py-4 font-bold text-xl rounded-none border-2 transition-all transform ${isDrawer ? 'bg-dark-800 hover:bg-primary-600 text-white border-dark-600 hover:border-primary-400 hover:scale-105 cursor-pointer' : 'bg-dark-800/50 text-gray-400 border-dark-700 cursor-not-allowed'}`}
                                >
                                    {w}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* The Canvas Component */}
                <div className="flex-1 CanvasContainer bg-white/95 rounded-none-2xl relative shadow-inner overflow-hidden border-t border-dark-700/50">
                    {/* Add subtle dot pattern to canvas background */}
                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <Canvas socket={socket} roomId={roomId} isDrawer={isDrawer && roomData.status === 'playing'} />
                </div>
            </div>

            {/* Right Sidebar - Chat Area */}
            <div className="w-full md:w-96 h-80 md:h-auto shrink-0 transition-all duration-300 flex flex-col md:self-stretch">
                <Chat socket={socket} roomId={roomId} roomData={roomData} />
            </div>
        </div >
    );
}

// Separate component for Hint Display to manage its own state listening to word_hint
function HintDisplay({ socket }) {
    const [hint, setHint] = useState('');

    useEffect(() => {
        socket.on('word_hint', (incomingHint) => setHint(incomingHint));
        return () => socket.off('word_hint');
    }, [socket]);

    const letterCount = hint ? (hint.match(/[_a-zA-Z]/g) || []).length : 0;

    return (
        <span className="font-mono text-xl font-bold tracking-[0.2em] text-white flex items-center justify-center gap-3 bg-dark-900 px-4 py-1 rounded-none border border-dark-600">
            <span>{hint || '???'}</span>
            {hint && (
                <span className="text-sm text-primary-400 tracking-normal border-l border-dark-700 pl-3">
                    ({letterCount})
                </span>
            )}
        </span>
    );
}
