import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

const AnimatedCounter = ({ value, duration = 2000, className = '' }) => {
  const [count, setCount] = useState(value || 0);
  const [previousValue, setPreviousValue] = useState(value);
  const ref = useRef(null);
  // Use a more lenient margin for mobile devices
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // Reset and animate when value changes
  useEffect(() => {
    if (previousValue !== value) {
      setPreviousValue(value);
      // Animate from current count to new value
      const startValue = count;
      const endValue = value;
      let startTime = null;
      let animationFrameId = null;

      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
        
        setCount(currentValue);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          setCount(endValue);
        }
      };

      animationFrameId = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [value, previousValue, count, duration]);

  // Initial animation when component mounts or comes into view
  useEffect(() => {
    // Skip if value hasn't changed from initial
    if (count === value && previousValue === value) return;

    // On mobile, start animation immediately if value is available
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (value > 0 && count !== value) {
        const startValue = count;
        const endValue = value;
        let startTime = null;
        let animationFrameId = null;

        const animate = (currentTime) => {
          if (!startTime) startTime = currentTime;
          const progress = Math.min((currentTime - startTime) / duration, 1);
          
          const easeOutQuart = 1 - Math.pow(1 - progress, 4);
          const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
          
          setCount(currentValue);

          if (progress < 1) {
            animationFrameId = requestAnimationFrame(animate);
          } else {
            setCount(endValue);
          }
        };

        animationFrameId = requestAnimationFrame(animate);
        
        return () => {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
        };
      }
      return;
    }

    // Desktop behavior - wait for in view
    if (!isInView) return;
    if (count === value) return; // Already at target value

    const startValue = count;
    const endValue = value;
    let startTime = null;
    let animationFrameId = null;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      
      setCount(currentValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isInView, value, count, duration, previousValue]);

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

