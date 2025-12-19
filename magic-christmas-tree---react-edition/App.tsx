
import React, { useState, useEffect, useCallback } from 'react';
import ChristmasTree from './components/ChristmasTree';
import { GREETINGS } from './constants';
import { AppState, Bubble } from './types';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.TREE);
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [isUIVisible, setIsUIVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    const createBubble = useCallback(() => {
        const id = Date.now() + Math.random();
        const text = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        const left = (5 + Math.random() * 85) + '%';
        const top = (15 + Math.random() * 65) + '%';
        const duration = (3 + Math.random() * 2.5) + 's';
        
        const newBubble: Bubble = { id, text, left, top, duration };
        setBubbles(prev => [...prev.slice(-49), newBubble]); // 限制在50个泡泡以内

        setTimeout(() => {
            setBubbles(prev => prev.filter(b => b.id !== id));
        }, parseFloat(duration) * 1000);
    }, []);

    useEffect(() => {
        let timer: any = null;
        if (appState === AppState.EXPLODED) {
            // 初始爆开
            for (let i = 0; i < 15; i++) {
                setTimeout(createBubble, Math.random() * 1000);
            }
            timer = setInterval(createBubble, 150);
        } else {
            setBubbles([]);
        }
        return () => { if (timer) clearInterval(timer); };
    }, [appState, createBubble]);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const toggleMode = () => {
        if (appState === AppState.TREE) {
            setAppState(AppState.EXPLODED);
            setIsUIVisible(false);
        } else {
            setAppState(AppState.TREE);
            setIsUIVisible(true);
        }
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-black font-sans">
            {/* 3D 圣诞树层 */}
            <ChristmasTree appState={appState} onInteract={toggleMode} />

            {/* UI 层 */}
            <div className={`absolute top-5 left-5 z-10 transition-opacity duration-500 pointer-events-none ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}>
                <h1 className="text-2xl font-extralight tracking-widest uppercase mb-2 bg-gradient-to-r from-white via-yellow-400 to-white bg-clip-text text-transparent">
                    Merry Christmas
                </h1>
                <p className="text-[10px] opacity-70 tracking-widest">点击这棵树开启惊喜</p>
            </div>

            {/* 加载中 */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-50 transition-opacity duration-500">
                    <div className="text-yellow-600 text-sm tracking-widest font-light">CRAFTING MAGIC...</div>
                </div>
            )}

            {/* 祝福泡泡容器 */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {bubbles.map(bubble => (
                    <div
                        key={bubble.id}
                        className="bubble-message absolute px-4 py-2 rounded-full text-white text-sm whitespace-nowrap backdrop-blur-sm border border-yellow-500/40 bg-yellow-500/20 shadow-[0_0_10px_rgba(255,215,0,0.2)]"
                        style={{
                            left: bubble.left,
                            top: bubble.top,
                            animationDuration: bubble.duration
                        }}
                    >
                        {bubble.text}
                    </div>
                ))}
            </div>

            {/* 控制按钮 */}
            <button 
                onClick={() => setIsUIVisible(!isUIVisible)}
                className="absolute bottom-5 right-5 w-12 h-12 flex items-center justify-center rounded-full border border-yellow-500/30 bg-black/30 backdrop-blur text-yellow-500 text-2xl transition-all hover:scale-110 active:scale-95 z-20"
                title="切换 UI 显示"
            >
                ⛶
            </button>
        </div>
    );
};

export default App;
