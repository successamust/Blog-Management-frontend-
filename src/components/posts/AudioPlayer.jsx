import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';

const AudioPlayer = ({ src, title, artist, coverImage }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const skip = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl p-6 bg-surface-subtle">
      <div className="flex items-start gap-4 mb-4">
        {coverImage && (
          <img
            src={coverImage}
            alt={title || 'Audio cover'}
            className="w-20 h-20 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          {title && <h3 className="font-semibold text-primary mb-1">{title}</h3>}
          {artist && <p className="text-sm text-secondary">{artist}</p>}
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-10)}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
            aria-label="Skip back 10 seconds"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <motion.button
            onClick={togglePlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-[var(--accent)] text-white rounded-full"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </motion.button>
          <button
            onClick={() => skip(10)}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
            aria-label="Skip forward 10 seconds"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;

