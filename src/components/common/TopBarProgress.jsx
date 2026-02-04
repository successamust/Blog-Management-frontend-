import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A slim, premium progress bar at the top of the viewport.
 * Used as a fallback during route transitions to eliminate the "blank screen" flash.
 */
const TopBarProgress = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Simulate progress to give immediate feedback
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev; // Hold at 90% until done
                const randomInc = Math.floor(Math.random() * 10) + 5;
                return Math.min(prev + randomInc, 90);
            });
        }, 200);

        return () => {
            clearInterval(timer);
            setProgress(100);
        };
    }, []);

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
            <motion.div
                initial={{ width: '0%', opacity: 1 }}
                animate={{ width: `${progress}%` }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                className="h-[3px] bg-gradient-to-r from-[var(--accent)] via-[var(--primary)] to-[var(--accent-secondary)] shadow-[0_0_8px_rgba(26,137,23,0.5)]"
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            />
        </div>
    );
};

export default TopBarProgress;
