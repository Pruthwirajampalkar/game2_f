import { useRef, useEffect, useState } from 'react';
import { Eraser, Trash2, PenTool, ChevronUp } from 'lucide-react';

export default function Canvas({ socket, roomId, isDrawer }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(5);
    const [tool, setTool] = useState('pen');
    const [showColors, setShowColors] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const palette = [
        '#000000', '#ffffff', '#6b7280', '#ef4444',
        '#f97316', '#eab308', '#84cc16', '#22c55e',
        '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 600);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        contextRef.current = ctx;
    }, []);

    useEffect(() => {
        if (!contextRef.current) return;
        contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        contextRef.current.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    }, [color, lineWidth, tool]);

    useEffect(() => {
        socket.on('draw_update', (d) => {
            const ctx = contextRef.current;
            if (!ctx) return;
            const prev = { c: ctx.strokeStyle, lw: ctx.lineWidth };
            ctx.strokeStyle = d.color; ctx.lineWidth = d.lineWidth;
            ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke(); ctx.closePath();
            ctx.strokeStyle = prev.c; ctx.lineWidth = prev.lw;
        });
        socket.on('canvas_cleared', () => {
            const ctx = contextRef.current, cv = canvasRef.current;
            if (ctx && cv) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); }
        });
        socket.on('fill_background', (c) => {
            const ctx = contextRef.current, cv = canvasRef.current;
            if (ctx && cv) { const p = ctx.fillStyle; ctx.fillStyle = c; ctx.fillRect(0, 0, cv.width, cv.height); ctx.fillStyle = p; }
        });
        return () => { socket.off('draw_update'); socket.off('canvas_cleared'); socket.off('fill_background'); };
    }, [socket]);

    const getCoords = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
    };

    const startDrawing = (e) => {
        if (!isDrawer) return;
        setShowColors(false);
        const { x, y } = getCoords(e);
        setIsDrawing(true); lastPos.current = { x, y };
    };
    const finishDrawing = () => { if (isDrawer) setIsDrawing(false); };
    const draw = (e) => {
        if (!isDrawing || !isDrawer) return;
        if (e.type === 'touchmove') e.preventDefault();
        const { x, y } = getCoords(e);
        const { x: x0, y: y0 } = lastPos.current;
        const ctx = contextRef.current;
        if (ctx) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); ctx.closePath(); }
        const drawColor = tool === 'eraser' ? '#ffffff' : color;
        const drawWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
        socket.emit('draw', { roomId, drawData: { x0, y0, x1: x, y1: y, color: drawColor, lineWidth: drawWidth } });
        lastPos.current = { x, y };
    };

    const clearCanvas = () => {
        if (!isDrawer) return;
        const ctx = contextRef.current, cv = canvasRef.current;
        if (ctx && cv) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); socket.emit('clear_canvas', roomId); }
    };

    const sizes = [3, 6, 12, 22];
    const activeColor = tool === 'eraser' ? '#ffffff' : color;

    return (
        <div className="absolute inset-0 flex flex-col bg-gray-100">
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing} onMouseUp={finishDrawing} onMouseLeave={finishDrawing} onMouseMove={draw}
                onTouchStart={startDrawing} onTouchEnd={finishDrawing} onTouchMove={draw}
                style={{ touchAction: 'none' }}
                className={`flex-1 w-full h-full object-contain ${isDrawer ? 'cursor-crosshair' : 'cursor-default pointer-events-none'}`}
            />

            {/* ── Toolbar (only for drawer) ── */}
            {isDrawer && (
                <div className="relative shrink-0">

                    {/* Color palette popup */}
                    {showColors && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-dark-800/95 backdrop-blur border border-white/10 rounded-2xl p-3 shadow-2xl z-30">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2 text-center">Pick a Color</p>
                            <div className="grid grid-cols-6 gap-2">
                                {palette.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => { setColor(c); setTool('pen'); setShowColors(false); }}
                                        className={`w-8 h-8 rounded-xl transition-all hover:scale-110 ${c === '#ffffff' ? 'border border-gray-500' : ''} ${color === c && tool === 'pen' ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-800 scale-110' : 'opacity-80 hover:opacity-100'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main toolbar */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-dark-800/95 backdrop-blur border-t border-white/10">

                        {/* Left: Color button + pen/eraser */}
                        <div className="flex items-center gap-2">
                            {/* Color swatch button */}
                            <button
                                onClick={() => setShowColors(!showColors)}
                                title="Pick color"
                                className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl border transition-all ${showColors ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600 bg-dark-700 hover:bg-dark-600'}`}
                            >
                                <div
                                    className="w-6 h-6 rounded-lg border border-white/20 shrink-0"
                                    style={{ backgroundColor: activeColor }}
                                />
                                <ChevronUp size={12} className={`text-gray-400 transition-transform ${showColors ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Pen */}
                            <button
                                onClick={() => { setTool('pen'); setShowColors(false); }}
                                title="Pen"
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${tool === 'pen' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'}`}
                            >
                                <PenTool size={14} />
                            </button>

                            {/* Eraser */}
                            <button
                                onClick={() => { setTool('eraser'); setShowColors(false); }}
                                title="Eraser"
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${tool === 'eraser' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'}`}
                            >
                                <Eraser size={14} />
                            </button>
                        </div>

                        {/* Center: Brush sizes */}
                        <div className="flex items-center gap-1.5">
                            {sizes.map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setLineWidth(s); setShowColors(false); }}
                                    title={`Size ${s}`}
                                    className={`flex items-center justify-center rounded-xl transition-all ${lineWidth === s ? 'bg-primary-500' : 'bg-dark-700 hover:bg-dark-600'}`}
                                    style={{ width: s + 12, height: s + 12 }}
                                >
                                    <div className="bg-white rounded-full" style={{ width: Math.min(s, 9), height: Math.min(s, 9) }} />
                                </button>
                            ))}
                        </div>

                        {/* Right: Clear */}
                        <button
                            onClick={clearCanvas}
                            title="Clear canvas"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 hover:border-transparent text-xs font-bold shrink-0"
                        >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Clear</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
