import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {Cue, SubtitleStyle, VideoMetadata} from '@shared/subtitles';
import {chunkWords, getActiveChunk, getActiveCue, splitCueIntoWords} from '@shared/subtitles';
import {getPreviewSubtitleBoxStyle} from '@shared/render';

type VideoPreviewProps = {
  video: VideoMetadata;
  cues: Cue[];
  style: SubtitleStyle;
  onStyleChange?: (style: SubtitleStyle) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const VideoPreview: React.FC<VideoPreviewProps> = ({video, cues, style, onStyleChange}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const activeCue = useMemo(() => getActiveCue(cues, currentMs), [cues, currentMs]);

  // Drag state
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{mouseX: number; mouseY: number; posX: number; posY: number} | null>(null);

  // Resize state
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef<{mouseY: number; fontSize: number} | null>(null);

  useEffect(() => {
    setCurrentMs(0);
  }, [video.previewUrl, cues]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    let frameId = 0;
    const updateTime = () => setCurrentMs(element.currentTime * 1000);

    const tick = () => {
      updateTime();
      if (!element.paused && !element.ended) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    const start = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      window.cancelAnimationFrame(frameId);
      updateTime();
    };

    element.addEventListener('play', start);
    element.addEventListener('playing', start);
    element.addEventListener('pause', stop);
    element.addEventListener('seeked', updateTime);
    element.addEventListener('timeupdate', updateTime);
    element.addEventListener('ended', stop);
    updateTime();

    return () => {
      window.cancelAnimationFrame(frameId);
      element.removeEventListener('play', start);
      element.removeEventListener('playing', start);
      element.removeEventListener('pause', stop);
      element.removeEventListener('seeked', updateTime);
      element.removeEventListener('timeupdate', updateTime);
      element.removeEventListener('ended', stop);
    };
  }, [video.previewUrl]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!onStyleChange) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    dragStart.current = {mouseX: e.clientX, mouseY: e.clientY, posX: style.positionX ?? 50, posY: style.positionY ?? 82};
  }, [onStyleChange, style.positionX, style.positionY]);

  useEffect(() => {
    if (!dragging || !onStyleChange) return;

    const handleMove = (e: MouseEvent) => {
      const overlay = overlayRef.current;
      const start = dragStart.current;
      if (!overlay || !start) return;

      const rect = overlay.getBoundingClientRect();
      const dx = ((e.clientX - start.mouseX) / rect.width) * 100;
      const dy = ((e.clientY - start.mouseY) / rect.height) * 100;

      onStyleChange({
        ...style,
        positionX: clamp(start.posX + dx, 5, 95),
        positionY: clamp(start.posY + dy, 5, 95),
      });
    };

    const handleUp = () => {
      setDragging(false);
      dragStart.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, onStyleChange, style]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!onStyleChange) return;
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = {mouseY: e.clientY, fontSize: style.fontSize};
  }, [onStyleChange, style.fontSize]);

  useEffect(() => {
    if (!resizing || !onStyleChange) return;

    const handleMove = (e: MouseEvent) => {
      const overlay = overlayRef.current;
      const start = resizeStart.current;
      if (!overlay || !start) return;

      const rect = overlay.getBoundingClientRect();
      const dy = e.clientY - start.mouseY;
      const previewScale = rect.width > 0 ? rect.width / Math.max(video.width, 1) : 1;
      const newSize = clamp(Math.round(start.fontSize + (dy / Math.max(previewScale, 0.0001))), 0, 128);

      onStyleChange({...style, fontSize: newSize});
    };

    const handleUp = () => {
      setResizing(false);
      resizeStart.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizing, onStyleChange, style, video.width]);

  const chunks = useMemo(() => {
    if (!activeCue) return [];
    return chunkWords(splitCueIntoWords(activeCue));
  }, [activeCue?.id, activeCue?.startMs, activeCue?.endMs, activeCue?.text]);

  const activeChunk = useMemo(
    () => (chunks.length > 0 ? getActiveChunk(chunks, currentMs) : null),
    [chunks, currentMs],
  );

  const chunkKey = activeChunk ? `${activeChunk[0].startMs}` : '';
  const boxStyle = getPreviewSubtitleBoxStyle(style, video.width);
  const interactive = !!onStyleChange;

  return (
    <div className="video-preview-shell" style={{aspectRatio: `${video.width}/${video.height}`}}>
      <video
        ref={videoRef}
        className="video-preview-element"
        controls
        src={video.previewUrl}
        onTimeUpdate={(event) => setCurrentMs(event.currentTarget.currentTime * 1000)}
      />
      <div
        ref={overlayRef}
        className="video-preview-overlay"
      >
        {activeChunk && (
          <div
            key={chunkKey}
            className={`video-preview-subtitle${interactive ? ' subtitle-interactive' : ''}${dragging ? ' subtitle-dragging' : ''}`}
            style={{
              ...boxStyle,
              color: undefined,
              position: 'absolute',
              left: `${style.positionX ?? 50}%`,
              top: `${style.positionY ?? 82}%`,
              transform: 'translate(-50%, -50%)',
              animation: dragging || resizing ? 'none' : 'subtitle-pop 240ms ease-out',
              boxShadow: `0 calc(24 * 100cqw / ${Math.max(video.width, 1)}) calc(50 * 100cqw / ${Math.max(video.width, 1)}) rgba(0, 0, 0, 0.12)`,
              letterSpacing: '-0.03em',
            }}
            onMouseDown={interactive ? handleDragStart : undefined}
          >
            {activeChunk.map((word, i) => (
              <span
                key={i}
                className={`subtitle-word${currentMs >= word.startMs ? ' said' : ''}`}
                style={{color: currentMs >= word.startMs ? style.textColor : undefined}}
              >
                {i > 0 ? ' ' : ''}{word.text}
              </span>
            ))}
            {interactive && (
              <div
                className="subtitle-resize-handle"
                onMouseDown={handleResizeStart}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
