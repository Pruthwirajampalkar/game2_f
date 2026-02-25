import { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle } from 'lucide-react';

export default function Chat({ socket, roomId, roomData }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        socket.on('chat_message', ({ username, message }) => {
            setMessages(p => [...p, { type: 'chat', username, message }]);
        });

        socket.on('correct_guess', ({ username }) => {
            setMessages(p => [...p, { type: 'system', text: `${username} guessed the word!`, color: 'text-primary-400 font-bold' }]);
        });

        socket.on('round_ended', ({ word }) => {
            setMessages(p => [...p, { type: 'system', text: `Round ended! The word was '${word}'`, color: 'text-yellow-400 font-bold' }]);
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
        if (input.trim()) {
            socket.emit('guess', { roomId, guess: input.trim() });
            setInput('');
        }
    };

    return (
        <div className="flex flex-col flex-1 w-full h-full max-h-full bg-dark-800/60 backdrop-blur-xl rounded-none border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 hover:border-white/20">
            <div className="p-5 border-b border-white/5 bg-dark-900/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-none bg-green-500 animate-pulse"></div>
                    <h2 className="font-bold text-white tracking-wide">Live Chat</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1 custom-scrollbar min-h-0 bg-dark-900/20 shadow-inner">
                {messages.map((m, i) => {
                    if (m.type === 'system') {
                        return (
                            <div key={i} className="text-[13px] py-1 px-3 bg-white/5 mx-2 rounded-none text-center backdrop-blur-sm border border-white/5">
                                <span className={m.color || 'text-gray-300 font-medium'}>{m.text}</span>
                            </div>
                        );
                    }
                    if (m.username === 'System') return null;

                    const isHost = roomData?.players?.[0]?.username === m.username;
                    const isYou = roomData?.players?.find(p => p.id === socket.id)?.username === m.username;

                    return (
                        <div
                            key={i}
                            className={`text-[15px] leading-relaxed py-1.5 px-3 mx-1 hover:bg-white/10 rounded-none transition-colors flex items-start flex-wrap gap-x-2 ${isYou ? 'bg-primary-900/10 border border-primary-500/10' : ''}`}
                        >
                            <span className={`font-bold shrink-0 drop-shadow-sm ${isHost ? 'text-red-400' : (isYou ? 'text-primary-400' : 'text-emerald-400')}`}>{m.username}:</span>
                            <span className="text-gray-200 break-words flex-1 opacity-90">{m.message}</span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 bg-dark-900/80 backdrop-blur-md border-t border-dark-700 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={roomData?.status !== 'playing'}
                    placeholder={roomData?.status === 'playing' ? "Type your guess..." : "Waiting for game..."}
                    className="flex-1 px-4 py-2 bg-dark-800 border border-dark-600 rounded-none text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || roomData?.status !== 'playing'}
                    className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 w-10 h-10"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
