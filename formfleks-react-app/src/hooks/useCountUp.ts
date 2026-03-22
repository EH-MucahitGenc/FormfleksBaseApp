import { useState, useEffect } from 'react';

/**
 * Enterprise V4 CountUp Hook
 * Animates a number from 0 to the target value using ease-out cubic.
 */
export const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      const easeProgress = easeOutCubic(percentage);
      
      setCount(Math.floor(end * easeProgress));

      if (progress < duration) {
        animationFrame = requestAnimationFrame(updateCount);
      } else {
        setCount(end); // Ensure we hit exact value at the end
      }
    };

    animationFrame = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};
