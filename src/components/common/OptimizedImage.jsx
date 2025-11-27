import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';

const OptimizedImage = ({
  src,
  alt = '',
  className = '',
  width,
  height,
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 80,
  placeholder = 'blur',
  fallback = null,
  onLoad,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'lazy' && !isInView && 'IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              if (observerRef.current && imgRef.current) {
                observerRef.current.unobserve(imgRef.current);
              }
            }
          });
        },
        {
          rootMargin: '50px',
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [loading, isInView]);

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      if (onLoad) onLoad();
    };
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      if (onError) onError();
    };
    img.src = src;
  }, [isInView, src, onLoad, onError]);

  // Generate responsive srcset for WebP if possible
  const generateSrcSet = (baseSrc) => {
    if (!baseSrc || typeof baseSrc !== 'string') return null;
    
    // If it's an external URL or data URL, return as is
    if (baseSrc.startsWith('http') || baseSrc.startsWith('data:') || baseSrc.startsWith('//')) {
      return null;
    }

    // Generate different sizes for responsive images
    const sizes = [400, 800, 1200, 1600];
    return sizes
      .map((size) => {
        // Try to generate WebP version
        const webpSrc = baseSrc.replace(/\.(jpg|jpeg|png)$/i, `.webp`);
        return `${webpSrc}?w=${size} ${size}w`;
      })
      .join(', ');
  };

  const srcSet = generateSrcSet(src);

  if (hasError && fallback) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
        style={{ width, height }}
        {...props}
      >
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (hasError) {
    return null;
  }

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
      {...props}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      {isInView && imageSrc && (
        <picture>
          {srcSet && (
            <source
              type="image/webp"
              srcSet={srcSet}
              sizes={sizes}
            />
          )}
          <img
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            srcSet={srcSet || undefined}
            className={`transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            } ${className}`}
            loading={loading}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
              if (onError) onError();
            }}
            style={{ width: '100%', height: 'auto' }}
          />
        </picture>
      )}
    </div>
  );
};

export default OptimizedImage;

