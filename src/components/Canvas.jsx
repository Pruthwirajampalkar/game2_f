import { useRef, useEffect, useState } from 'react';
import { Eraser, Trash2, PaintBucket, PenTool } from 'lucide-react';

export default function Canvas({ socket, roomId, isDrawer }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(5);

    const colors = [
        '#000000', '#4b5563', '#ef4444', '#f97316', '#eab308',
        '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
        '#a855f7', '#ec4899', '#f43f5e', '#eccc68', '#ffffff'
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canonical size for sync (e.g. 800x600) and scale via CSS
        canvas.width = 800;
        canvas.height = 600;

        const context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        contextRef.current = context;
    }, []); // Run once on mount to set sizes

    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = lineWidth;
        }
    }, [color, lineWidth]);

    useEffect(() => {
        socket.on('draw_update', (drawData) => {
            if (!contextRef.current) return;
            const { x0, y0, x1, y1, color: c, lineWidth: lw } = drawData;

            const ctx = contextRef.current;
            const prevColor = ctx.strokeStyle;
            const prevLw = ctx.lineWidth;

            ctx.strokeStyle = c;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
            ctx.closePath();

            // restore
            ctx.strokeStyle = prevColor;
            ctx.lineWidth = prevLw;
        });

        socket.on('canvas_cleared', () => {
            const canvas = canvasRef.current;
            if (contextRef.current && canvas) {
                contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
            }
        });

        socket.on('fill_background', (c) => {
            const canvas = canvasRef.current;
            if (contextRef.current && canvas) {
                const prevFill = contextRef.current.fillStyle;
                contextRef.current.fillStyle = c;
                contextRef.current.fillRect(0, 0, canvas.width, canvas.height);
                contextRef.current.fillStyle = prevFill;
            }
        });

        return () => {
            socket.off('draw_update');
            socket.off('canvas_cleared');
            socket.off('fill_background');
        };
    }, [socket]);

    // Track previous coordinates
    const lastPos = useRef({ x: 0, y: 0 });

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e) => {
        if (!isDrawer) return;
        const { x, y } = getCoordinates(e);
        setIsDrawing(true);
        lastPos.current = { x, y };
    };

    const finishDrawing = () => {
        if (!isDrawer) return;
        setIsDrawing(false);
    };

    const draw = (e) => {
        if (!isDrawing || !isDrawer) return;

        // Prevent scrolling when drawing on touch devices
        if (e.type === 'touchmove') e.preventDefault();

        const { x, y } = getCoordinates(e);
        const x0 = lastPos.current.x;
        const y0 = lastPos.current.y;

        if (contextRef.current) {
            contextRef.current.beginPath();
            contextRef.current.moveTo(x0, y0);
            contextRef.current.lineTo(x, y);
            contextRef.current.stroke();
            contextRef.current.closePath();
        }

        // Emit to server
        socket.emit('draw', {
            roomId,
            drawData: { x0, y0, x1: x, y1: y, color, lineWidth }
        });

        lastPos.current = { x, y };
    };

    const clearCanvas = () => {
        if (!isDrawer) return;
        const canvas = canvasRef.current;
        if (contextRef.current && canvas) {
            contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
            socket.emit('clear_canvas', roomId);
        }
    };



    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 md:p-6 bg-gray-50/50">
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={finishDrawing}
                onMouseOut={finishDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={finishDrawing}
                onTouchMove={draw}
                className={`bg-white rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full h-full max-h-[700px] object-contain cursor-crosshair transition-all duration-300 ${!isDrawer ? 'pointer-events-none opacity-90' : 'hover:shadow-[0_8px_30px_rgb(0,0,0,0.18)]'}`}
                style={{ touchAction: 'none' }} // Crucial for preventing scroll on mobile while drawing
            />

            {/* Drawer Tools Overlay */}
            {isDrawer && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-[800px] bg-dark-800/90 backdrop-blur-2xl border border-white/10 p-2 md:p-4 rounded-none flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] transition-all z-20">
                    <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 md:border-r border-white/10 md:pr-4">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-7 h-7 md:w-9 md:h-9 rounded-none shadow-md hover:scale-110 transition-all duration-300 shrink-0 ${color === c ? 'ring-2 ring-offset-2 ring-offset-dark-800 ring-primary-500 scale-110 z-10' : 'opacity-80 hover:opacity-100'} ${c === '#ffffff' ? 'border border-gray-300 bg-checkered' : ''}`}
                                style={{ backgroundColor: c }}
                                title={c === '#ffffff' ? 'Eraser' : 'Color'}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-3 md:gap-4 px-2 md:border-r border-white/10 md:pr-4">
                        <button
                            onClick={() => {
                                // Reset to a drawing color if they happen to be on eraser
                                if (color === '#ffffff') setColor('#000000');
                            }}
                            className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-none transition-all duration-300 group shrink-0 ${color !== '#ffffff' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 ring-2 ring-primary-400 ring-offset-2 ring-offset-dark-800 scale-105' : 'bg-dark-700 text-gray-400 hover:bg-dark-600 hover:text-white'}`}
                            title="Pencil Tool"
                        >
                            <PenTool size={20} className={color !== '#ffffff' ? 'animate-pulse' : 'group-hover:scale-110'} />
                        </button>

                        <div className="flex items-center gap-2">
                            {[3, 5, 10, 20].map(w => (
                                <button
                                    key={w}
                                    onClick={() => setLineWidth(w)}
                                    className={`rounded-none transition-all duration-300 flex items-center justify-center shrink-0 ${lineWidth === w ? 'bg-primary-500 ring-2 ring-primary-500/50' : 'bg-gray-600 hover:bg-gray-500'}`}
                                    style={{ width: (w / 2) + 16, height: (w / 2) + 16 }}
                                    title={`Brush size ${w}`}
                                >
                                    <div className="bg-white rounded-none" style={{ width: w > 10 ? 10 : w, height: w > 10 ? 10 : w }}></div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pl-2">


                        <button
                            onClick={clearCanvas}
                            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-none bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-105 group border border-red-500/20 hover:border-transparent shrink-0"
                            title="Clear Canvas"
                        >
                            <Trash2 size={20} className="group-hover:animate-pulse" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
