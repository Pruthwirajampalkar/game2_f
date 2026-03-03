import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import { Crown, Trophy, Play, Palette, Copy, Check, Settings, X, LogOut } from 'lucide-react';
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
    const [showSettings, setShowSettings] = useState(false);
    const [copied, setCopied] = useState(false);

    const initialUsername = location.state?.username || (() => {
        try {
            const s = localStorage.getItem('gameSession');
            if (s) { const p = JSON.parse(s); if (p.roomId === roomId) return p.username; }
        } catch (e) { }
        return '';
    })();

    const initialAvatar = location.state?.avatar || (() => {
        try {
            const s = localStorage.getItem('gameSession');
            if (s) { const p = JSON.parse(s); if (p.roomId === roomId) return p.avatar; }
        } catch (e) { }
        return 'Felix';
    })();

    const username = initialUsername;
    const avatar = initialAvatar;

    useEffect(() => {
        if (!username) {
            const stored = localStorage.getItem('gameSession');
            if (stored) {
                try {
                    const s = JSON.parse(stored);
                    if (s.roomId === roomId) { socket.emit('join_room', { username: s.username, avatar: s.avatar, roomId }); return; }
                } catch (e) { localStorage.removeItem('gameSession'); }
            }
            navigate('/');
            return;
        }
        localStorage.setItem('gameSession', JSON.stringify({ username, avatar, roomId, timestamp: Date.now() }));
        socket.emit('join_room', { username, avatar, roomId });

        socket.on('room_update', setRoomData);
        socket.on('room_error', (msg) => { alert(msg); navigate('/'); });
        socket.on('timer_update', setTimeLeft);
        socket.on('choose_word_options', (opts) => { setWordOptions(opts); setGameOverData(null); setRoundOverData(null); });
        socket.on('game_started', () => { setWordOptions([]); setRoundOverData(null); });
        socket.on('round_ended', (data) => { setWordOptions([]); setRoundOverData(data); });
        socket.on('game_over', (data) => { setGameOverData(data); setWordOptions([]); setRoundOverData(null); });

        return () => {
            ['room_update', 'room_error', 'timer_update', 'choose_word_options', 'game_started', 'round_ended', 'game_over'].forEach(e => socket.off(e));
        };
    }, [socket, username, navigate, roomId, avatar]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    if (!roomData) return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-dark-900 min-h-screen">
            <div className="w-14 h-14 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Connecting to room...</p>
        </div>
    );

    const isDrawer = roomData.currentDrawer === socket.id;
    const isHost = roomData.hostId === socket.id;
    const timerDanger = timeLeft <= 15;
    const totalTime = roomData.turnTime || 120;
    const timerPct = totalTime > 0 ? Math.min(100, (timeLeft / totalTime) * 100) : 0;

    return (
        <div className="flex flex-col bg-dark-900" style={{ height: '100dvh' }}>

            {/* ── TOP BAR ── */}
            <header className="flex items-center gap-2 px-3 py-2 bg-dark-800/90 backdrop-blur border-b border-white/5 shrink-0 z-20">
                {/* Brand desktop */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-emerald-400 rounded-lg flex items-center justify-center">
                        <Palette size={13} className="text-white" />
                    </div>
                    <span className="font-black text-white text-sm">SketchClue</span>
                </div>

                {/* Round */}
                <div className="px-2 py-1 bg-dark-700 rounded-lg border border-dark-600 text-xs font-bold text-gray-300 shrink-0">
                    <span className="text-primary-400">{roomData.round || 1}</span>/{roomData.maxRounds || 3}
                </div>

                {/* Word / status */}
                <div className="flex-1 flex justify-center overflow-hidden px-1">
                    {roomData.status === 'playing' && (
                        isDrawer ? (
                            <div className="flex items-center gap-2 bg-dark-900 px-3 py-1 rounded-xl border border-primary-500/20 max-w-full overflow-hidden">
                                <span className="text-gray-400 text-xs shrink-0">Draw:</span>
                                <span className="font-black text-white text-sm tracking-widest uppercase truncate">{roomData.currentWord}</span>
                                <span className="text-primary-400 text-xs border-l border-dark-700 pl-2 shrink-0">
                                    {(roomData.currentWord?.match(/[a-zA-Z]/g) || []).length}L
                                </span>
                            </div>
                        ) : <HintDisplay socket={socket} />
                    )}
                    {roomData.status === 'choosing_word' && (
                        <p className="text-primary-400 font-bold text-xs animate-pulse truncate">
                            {isDrawer ? '🎯 Pick a word!' : `${roomData.players.find(p => p.id === roomData.currentDrawer)?.username || '...'} is choosing...`}
                        </p>
                    )}
                    {roomData.status === 'lobby' && <p className="text-gray-500 text-xs">Waiting in lobby...</p>}
                    {roomData.status === 'round_end' && <p className="text-yellow-400 font-bold text-xs">Round ended!</p>}
                    {roomData.status === 'game_over' && <p className="text-red-400 font-black text-xs uppercase tracking-widest">Game Over</p>}
                </div>

                {/* Timer */}
                {(roomData.status === 'playing' || roomData.status === 'choosing_word') && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono font-black text-xs border shrink-0 transition-colors ${timerDanger ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' : 'bg-dark-700 text-primary-400 border-dark-600'}`}>
                        ⏱{timeLeft}s
                        <div className="w-10 h-1 bg-dark-600 rounded-full overflow-hidden hidden sm:block">
                            <div className={`h-full rounded-full transition-all duration-1000 ${timerDanger ? 'bg-red-500' : 'bg-primary-500'}`} style={{ width: `${timerPct}%` }} />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    {/* Room code */}
                    <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-dark-700 rounded-lg border border-dark-600">
                        <span className="text-xs font-mono font-bold text-gray-300">{roomId}</span>
                        <button onClick={handleCopyLink} className="text-gray-500 hover:text-primary-400 transition-colors">
                            {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                        </button>
                    </div>
                    <button onClick={handleCopyLink} className="sm:hidden w-7 h-7 bg-dark-700 text-gray-400 hover:text-primary-400 rounded-lg flex items-center justify-center border border-dark-600">
                        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>

                    {/* Settings */}
                    {roomData.status === 'lobby' && (
                        <div className="relative">
                            <button onClick={() => setShowSettings(!showSettings)} className="w-7 h-7 bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white rounded-lg flex items-center justify-center transition-colors border border-dark-600">
                                <Settings size={13} />
                            </button>
                            {showSettings && (
                                <div className="absolute right-0 top-9 w-52 bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl p-4 z-50">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                                        Settings <button onClick={() => setShowSettings(false)} className="text-gray-600 hover:text-white"><X size={12} /></button>
                                    </p>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Rounds', key: 'maxRounds', val: roomData.maxRounds || 3, opts: [2, 3, 5, 8] },
                                            { label: 'Time (s)', key: 'turnTime', val: roomData.turnTime || 120, opts: [30, 60, 90, 120] },
                                            { label: 'Players', key: 'maxPlayers', val: roomData.maxPlayers || 8, opts: [2, 3, 4, 5, 6, 7, 8] },
                                        ].map(({ label, key, val, opts }) => (
                                            <div key={key} className="flex justify-between items-center">
                                                <span className="text-xs text-gray-400">{label}</span>
                                                <select className="bg-dark-900 border border-dark-600 rounded-lg text-white text-xs px-2 py-1 outline-none disabled:opacity-40"
                                                    value={val} disabled={!isHost}
                                                    onChange={e => { socket.emit('update_settings', { roomId, settings: { [key]: parseInt(e.target.value) } }); setShowSettings(false); }}>
                                                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                    {isHost && (
                                        <button onClick={() => { socket.emit('start_game', roomId); setShowSettings(false); }}
                                            className="mt-3 w-full py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                                            <Play size={11} /> Start Game
                                        </button>
                                    )}
                                    {!isHost && <p className="text-[10px] text-gray-600 mt-2 text-center">Only host can change settings</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Start (lobby, host, desktop) */}
                    {roomData.status === 'lobby' && isHost && (
                        <button onClick={() => socket.emit('start_game', roomId)}
                            className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-primary-500 hover:bg-primary-400 text-white rounded-lg text-xs font-bold transition-colors">
                            <Play size={11} /> Start
                        </button>
                    )}

                    {/* Leave */}
                    <button onClick={() => { localStorage.removeItem('gameSession'); navigate('/'); }}
                        className="w-7 h-7 bg-dark-700 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg flex items-center justify-center transition-colors border border-dark-600">
                        <LogOut size={13} />
                    </button>
                </div>
            </header>

            {/* ── BODY ── */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* ══ DESKTOP: left players sidebar ══ */}
                <aside className="hidden md:flex flex-col w-52 shrink-0 bg-dark-800/40 border-r border-white/5 overflow-hidden">
                    <div className="p-3 border-b border-white/5 shrink-0">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Players <span className="text-primary-400">{roomData.players.length}</span>/{roomData.maxPlayers || 8}
                        </p>
                        {roomData.status === 'lobby' && isHost && (
                            <button onClick={() => socket.emit('start_game', roomId)}
                                className="mt-2 w-full py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                                <Play size={11} /> Start Game
                            </button>
                        )}
                        {roomData.status === 'lobby' && !isHost && (
                            <p className="text-[10px] text-gray-500 mt-2 text-center">Waiting for host...</p>
                        )}
                    </div>
                    <PlayerScroll roomData={roomData} socket={socket} />
                </aside>

                {/* ══ DESKTOP: canvas center ══ */}
                <div className="hidden md:flex flex-1 flex-col overflow-hidden relative">
                    <Canvas socket={socket} roomId={roomId} isDrawer={isDrawer && roomData.status === 'playing'} />
                    <Overlays />
                </div>

                {/* ══ DESKTOP: chat right ══ */}
                <div className="hidden md:flex w-64 shrink-0 flex-col border-l border-white/5">
                    <Chat socket={socket} roomId={roomId} roomData={roomData} />
                </div>

                {/* ══ MOBILE: 3-zone split layout ══ */}
                <div className="md:hidden flex flex-col flex-1 overflow-hidden">

                    {/* Zone 1: Canvas — top ~55% */}
                    <div className="relative overflow-hidden" style={{ flex: '0 0 55%' }}>
                        <Canvas socket={socket} roomId={roomId} isDrawer={isDrawer && roomData.status === 'playing'} />
                        <Overlays mobile />
                    </div>

                    {/* Zone 2: Players + Chat side by side — bottom ~45% */}
                    <div className="flex border-t border-white/5 overflow-hidden" style={{ flex: '0 0 45%' }}>

                        {/* Players — left half */}
                        <div className="flex flex-col w-1/2 border-r border-white/5 overflow-hidden bg-dark-800/40">
                            <div className="px-2 py-1.5 border-b border-white/5 shrink-0 flex items-center justify-between">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Players <span className="text-primary-400">{roomData.players.length}</span>
                                </p>
                                {roomData.status === 'lobby' && isHost && (
                                    <button onClick={() => socket.emit('start_game', roomId)}
                                        className="flex items-center gap-0.5 px-2 py-0.5 bg-primary-500 text-white rounded-lg text-[10px] font-bold">
                                        <Play size={9} /> Start
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                                {[...roomData.players].sort((a, b) => b.score - a.score).map((player, idx) => {
                                    const isMe = player.id === socket.id;
                                    const isCurrentDrawer = player.id === roomData.currentDrawer;
                                    const guessed = roomData.guessedPlayers?.includes(player.id);
                                    return (
                                        <div key={player.id} className="flex items-center gap-1.5 px-1.5 py-1">
                                            <div className="relative shrink-0">
                                                <Avatar seed={player.avatar || player.username} emotion={player.emotion} size={28} />
                                                {isCurrentDrawer && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary-500 rounded-full flex items-center justify-center">
                                                        <Palette size={7} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <p className={`text-[10px] font-bold truncate ${isMe ? 'text-primary-300' : 'text-white'}`}>{player.username}</p>
                                                    {player.id === roomData.hostId && <Crown size={7} className="text-yellow-400 shrink-0" />}
                                                </div>
                                                <p className="text-[9px] text-primary-400 font-bold leading-none">{player.score}pts</p>
                                            </div>
                                            {idx === 0 && player.score > 0 && <Trophy size={9} className="text-yellow-400 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Chat — right half */}
                        <div className="flex flex-col w-1/2 min-h-0 overflow-hidden">
                            <Chat socket={socket} roomId={roomId} roomData={roomData} compact />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── OVERLAYS ──────────────────────────────────────────────────────
    function Overlays({ mobile = false }) {
        return (
            <>
                {/* Word selection */}
                {wordOptions.length > 0 && roomData.status === 'choosing_word' && (
                    <div className="absolute inset-0 z-40 bg-dark-900/92 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-4">
                        <div className="text-center">
                            <p className={`font-black mb-0.5 ${mobile ? 'text-3xl' : 'text-4xl'} ${timerDanger ? 'text-red-400 animate-pulse' : 'text-white'}`}>{timeLeft}s</p>
                            <p className="text-gray-400 text-xs">{isDrawer ? 'Choose a word to draw' : `${roomData.players.find(p => p.id === roomData.currentDrawer)?.username} is choosing...`}</p>
                        </div>
                        {isDrawer ? (
                            <div className={`flex gap-2 justify-center ${mobile ? 'flex-col w-full max-w-[90%]' : 'flex-wrap'}`}>
                                {wordOptions.map(w => (
                                    <button key={w} onClick={() => socket.emit('word_chosen', { roomId, word: w })}
                                        className={`${mobile ? 'w-full py-3 text-base' : 'px-6 py-3 text-lg'} bg-dark-800 hover:bg-primary-600 border-2 border-dark-600 hover:border-primary-400 text-white font-black rounded-2xl transition-all hover:scale-105`}>
                                        {w}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex gap-2 flex-wrap justify-center">
                                {wordOptions.map((_, i) => (
                                    <div key={i} className="px-5 py-3 bg-dark-800 border-2 border-dark-700 text-gray-600 font-black text-base rounded-2xl">{'?'.repeat(3 + i)}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Round over */}
                {roundOverData && roomData.status === 'round_end' && !gameOverData && (
                    <div className="absolute inset-0 z-40 bg-dark-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
                        <p className={`font-black text-white mb-1 ${mobile ? 'text-2xl' : 'text-3xl'}`}>Round Over!</p>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-gray-400 text-xs">The word was</span>
                            <span className="px-2 py-0.5 bg-dark-800 border border-primary-500/30 rounded-xl text-primary-300 font-black uppercase tracking-widest text-xs">{roundOverData.word}</span>
                        </div>
                        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-3 w-full max-w-xs shadow-2xl">
                            <div className="space-y-1">
                                {[...roundOverData.players].sort((a, b) => b.score - a.score).map((p, idx) => (
                                    <div key={p.id} className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl ${p.guessed ? 'bg-green-500/10 border border-green-500/20' : 'bg-dark-900 border border-dark-700'}`}>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-xs font-black w-4 ${idx === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{idx + 1}</span>
                                            <span className="text-white text-xs font-semibold truncate max-w-[100px]">{p.username}</span>
                                            {p.guessed && <span className="text-[9px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-bold">✓</span>}
                                        </div>
                                        <span className="text-primary-400 font-bold text-xs shrink-0">{p.score}pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Game over */}
                {gameOverData && (
                    <div className="absolute inset-0 z-40 bg-dark-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
                        <Trophy size={mobile ? 40 : 56} className="text-yellow-400 mb-3 animate-bounce" />
                        <h2 className={`font-black text-white mb-0.5 ${mobile ? 'text-2xl' : 'text-3xl'}`}>Match Over!</h2>
                        <p className="text-gray-500 text-xs mb-4">Back to lobby soon...</p>
                        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-3 w-full max-w-xs shadow-2xl">
                            <div className="space-y-1">
                                {[...roomData.players].sort((a, b) => b.score - a.score).map((p, idx) => (
                                    <div key={p.id} className={`flex items-center justify-between px-2.5 py-2 rounded-xl ${idx === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/30' : 'bg-dark-900 border border-dark-700'}`}>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-xs font-black w-4 ${idx === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>#{idx + 1}</span>
                                            <span className="font-bold text-white text-xs truncate max-w-[100px]">{p.username}</span>
                                            {idx === 0 && <Crown size={10} className="text-yellow-400" />}
                                        </div>
                                        <span className={`font-mono font-bold text-xs ${idx === 0 ? 'text-yellow-400' : 'text-primary-400'}`}>{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }
}

function PlayerScroll({ roomData, socket }) {
    return (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {[...roomData.players].sort((a, b) => b.score - a.score).map((player, idx) => {
                const isMe = player.id === socket.id;
                const isCurrentDrawer = player.id === roomData.currentDrawer;
                const guessed = roomData.guessedPlayers?.includes(player.id);
                return (
                    <div key={player.id} className="flex items-center gap-2 p-2 transition-colors">
                        <div className="relative shrink-0">
                            <Avatar seed={player.avatar || player.username} emotion={player.emotion} size={34} />
                            {isCurrentDrawer && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary-500 rounded-full flex items-center justify-center">
                                    <Palette size={8} className="text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                                <p className={`text-xs font-bold truncate ${isMe ? 'text-primary-300' : 'text-white'}`}>{player.username}</p>
                                {player.id === roomData.hostId && <Crown size={8} className="text-yellow-400 shrink-0" />}
                            </div>
                            <p className="text-[10px] text-primary-400 font-bold">{player.score} pts</p>
                        </div>
                        {idx === 0 && player.score > 0 && <Trophy size={11} className="text-yellow-400 shrink-0" />}
                    </div>
                );
            })}
        </div>
    );
}

function HintDisplay({ socket }) {
    const [hint, setHint] = useState('');
    useEffect(() => {
        socket.on('word_hint', (h) => setHint(h));
        return () => socket.off('word_hint');
    }, [socket]);
    const count = hint ? (hint.match(/[_a-zA-Z]/g) || []).length : 0;
    return (
        <div className="flex items-center gap-2 bg-dark-900 px-2.5 py-1 rounded-xl border border-dark-600 max-w-full overflow-hidden">
            <span className="font-mono text-xs md:text-sm font-black tracking-[0.2em] text-white truncate">{hint || '???'}</span>
            {hint && <span className="text-[10px] text-primary-400 border-l border-dark-700 pl-2 shrink-0">{count}L</span>}
        </div>
    );
}
