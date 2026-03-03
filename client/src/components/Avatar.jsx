import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { micah } from '@dicebear/collection';

export default function Avatar({ seed, emotion = 'default', size = 40, className = "" }) {
    const avatar = useMemo(() => {
        let mouthOpt = 'smile';
        if (emotion === 'happy') mouthOpt = 'laughing';
        else if (emotion === 'sad') mouthOpt = 'sad';
        else if (emotion === 'curious') mouthOpt = 'smirk';

        return createAvatar(micah, {
            seed,
            backgroundColor: ["transparent"],
            radius: 50,
            mouth: [mouthOpt],
        }).toDataUri();
    }, [seed, emotion]);

    return (
        <div className={`relative rounded-full inline-block ${className}`} style={{ width: size, height: size, perspective: '500px' }}>
            {/* The base container for the avatar with extreme 3D shadows and inner gloss */}
            <div className="absolute inset-0 rounded-full overflow-hidden shadow-[0_15px_35px_-10px_rgba(0,0,0,0.6)] bg-gradient-to-br from-indigo-500/30 to-purple-500/30 transform transition-transform duration-500 hover:scale-110 hover:rotate-3 group border-2 border-white/20">
                <img
                    src={avatar}
                    alt={`${seed}'s avatar`}
                    width={size}
                    height={size}
                    className="drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] transform -translate-y-1 transition-transform group-hover:-translate-y-2"
                />

                {/* 3D Glassmorphism Highlight / Bevel Effect */}
                <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_10px_20px_rgba(255,255,255,0.4),inset_0_-15px_20px_rgba(0,0,0,0.5)] border-[0.5px] border-white/40 mix-blend-overlay"></div>
                <div className="absolute top-0 left-[20%] right-[20%] h-[30%] bg-gradient-to-b from-white/60 to-transparent rounded-full blur-[2px] opacity-70 pointer-events-none"></div>
            </div>
        </div>
    );
}
