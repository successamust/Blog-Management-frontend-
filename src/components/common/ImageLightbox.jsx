import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

const ImageLightbox = ({ images, currentIndex, onClose, onNext, onPrevious }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'ArrowRight') onNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, onNext, onPrevious]);

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[currentIndex].src;
    link.download = images[currentIndex].alt || 'image';
    link.click();
  };

  const currentImage = images[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              className="absolute left-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(prev => Math.max(0.5, prev - 0.25));
            }}
            className="p-2 hover:bg-white/20 rounded text-white transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white text-sm px-2">{Math.round(zoom * 100)}%</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(prev => Math.min(3, prev + 0.25));
            }}
            className="p-2 hover:bg-white/20 rounded text-white transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="p-2 hover:bg-white/20 rounded text-white transition-colors"
            aria-label="Download image"
          >
            <Download className="w-5 h-5" />
          </button>
          {images.length > 1 && (
            <>
              <div className="w-px h-6 bg-white/20 mx-1" />
              <span className="text-white text-sm px-2">
                {currentIndex + 1} / {images.length}
              </span>
            </>
          )}
        </div>

        {/* Image */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
          className="relative max-w-[90vw] max-h-[90vh] cursor-move"
          style={{
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
            transition: 'transform 0.2s',
          }}
          drag
          dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
          onDrag={(e, info) => {
            if (zoom > 1) {
              setPosition({ x: info.offset.x, y: info.offset.y });
            }
          }}
        >
          <img
            src={currentImage.src}
            alt={currentImage.alt || ''}
            className="max-w-full max-h-[90vh] object-contain"
            draggable={false}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageLightbox;

