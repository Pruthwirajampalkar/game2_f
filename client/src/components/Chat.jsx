import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';

export default function Chat({ socket, roomId, roomData, compact = false }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const isPlaying = roomData?.status === 'playing';
    const isDrawer = roomData?.currentDrawer === socket.id;
    const isGameOver = roomData?.status === 'game_over';

    useEffect(() => {
        socket.on('chat_message', ({ username, message }) => {
            setMessages(p => [...p, { type: 'chat', username, message }]);
        });

        socket.on('correct_guess', ({ username, points, isFirst }) => {
            const pointsText = points ? `+${points} pts` : '';
            setMessages(p => [...p, {
                type: 'correct',
                text: `🎉 ${username} guessed it!`,
                sub: pointsText,
                isFirst
            }]);
        });

        socket.on('round_ended', ({ word }) => {
            setMessages(p => [...p, {
                type: 'round',
                text: `Round ended — the word was "${word}"`
            }]);
        });

        return () => {
            socket.off('chat_message');
            socket.off('correct_guess');
            socket.off('round_ended');
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || isGameOver) return;
        if (isPlaying && !isDrawer) {
            socket.emit('guess', { roomId, guess: input.trim() });
        } else {
            socket.emit('send_message', { roomId, message: input.trim() });
        }
        setInput('');
    };

    const getPlayerColor = (username) => {
        const isHost = roomData?.players?.find(p => p.id === roomData?.hostId)?.username === username;
        const isYou = roomData?.players?.find(p => p.id === socket.id)?.username === username;
        if (isHost) return 'text-yellow-400';
        if (isYou) return 'text-primary-400';
        return 'text-emerald-400';
    };

    const placeholder = isGameOver
        ? 'Game over'
        : isPlaying && !isDrawer
            ? '💬 Type your guess...'
            : '💬 Chat...';

    return (
        <div className="flex flex-col flex-1 min-h-0 w-full bg-dark-800/40 backdrop-blur-xl border border-white/5 overflow-hidden">
            {/* Header — hidden on compact/mobile to save vertical space */}
            {!compact && (
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5 bg-dark-900/30 shrink-0">
                    <div className="w-8 h-8 bg-primary-500/20 rounded-xl flex items-center justify-center">
                        <MessageCircle size={15} className="text-primary-400" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-none">Live Chat</p>
                        {isPlaying && !isDrawer && (
                            <p className="text-[10px] text-primary-400 mt-0.5">Type to guess the word!</p>
                        )}
                    </div>
                    <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5 min-h-0">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-8">
                        <MessageCircle size={28} className="text-gray-500 mb-2" />
                        <p className="text-gray-500 text-xs">No messages yet</p>
                    </div>
                )}
                {messages.map((m, i) => {
                    if (m.type === 'correct') return (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${m.isFirst ? 'bg-yellow-500/15 border-yellow-500/30' : 'bg-primary-500/10 border-primary-500/20'}`}>
                            {m.isFirst && <span className="text-yellow-400 text-xs font-black shrink-0">1st!</span>}
                            <p className={`text-xs font-semibold flex-1 ${m.isFirst ? 'text-yellow-200' : 'text-primary-300'}`}>{m.text}</p>
                            {m.sub && <span className={`text-xs font-black shrink-0 ${m.isFirst ? 'text-yellow-400' : 'text-green-400'}`}>{m.sub}</span>}
                        </div>
                    );
                    if (m.type === 'round') return (
                        <div key={i} className="px-2 py-1 text-center">
                            <p className="text-yellow-400 text-[10px] font-semibold">{m.text}</p>
                        </div>
                    );
                    if (m.username === 'System') return (
                        <div key={i} className="px-3 py-1 text-center">
                            <p className="text-gray-500 text-[10px] italic">{m.message}</p>
                        </div>
                    );
                    return (
                        <div key={i} className="flex items-start gap-2 px-2 py-1 hover:bg-white/5 rounded-xl transition-colors group">
                            <span className={`text-xs font-bold shrink-0 pt-0.5 ${getPlayerColor(m.username)}`}>
                                {m.username}:
                            </span>
                            <span className="text-gray-200 text-xs break-words flex-1 leading-relaxed">{m.message}</span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-dark-700 bg-dark-900/50 shrink-0">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isGameOver}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all disabled:opacity-40"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isGameOver}
                    className="w-10 h-10 bg-primary-500 hover:bg-primary-400 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shrink-0"
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}
