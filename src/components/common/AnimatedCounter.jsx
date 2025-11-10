import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

const AnimatedCounter = ({ value, duration = 2000, className = '' }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);
  // Use a more lenient margin for mobile devices
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    // On mobile, start animation immediately if value is available
    // This ensures data shows even if intersection observer doesn't trigger
    if (typeof window !== 'undefined' && window.innerWidth < 768 && value > 0 && !hasAnimated) {
      setHasAnimated(true);
      let startTime = null;
      const startValue = 0;
      const endValue = value;

      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
        
        setCount(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(endValue);
        }
      };

      requestAnimationFrame(animate);
      return;
    }

    // Desktop behavior - wait for in view
    if (!isInView && !hasAnimated) return;

    if (hasAnimated) return;

    setHasAnimated(true);
    let startTime = null;
    const startValue = 0;
    const endValue = value;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      
      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value, duration, hasAnimated]);

  // Fallback: If value changes and we haven't animated, show value directly on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && value > 0 && count === 0) {
      const timer = setTimeout(() => {
        if (count === 0) {
          setCount(value);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [value, count]);

  return (
    <span ref={ref} className={className}>
      {count.toLocaleString()}
    </span>
  );
};

export default AnimatedCounter;

