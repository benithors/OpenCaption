import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {Cue, SubtitleStyle, VideoMetadata} from '@shared/subtitles';
import {getActiveCue} from '@shared/subtitles';
import {getSubtitleBoxStyle} from '@shared/render';

type VideoPreviewProps = {
  video: VideoMetadata;
  cues: Cue[];
  style: SubtitleStyle;
};

export const VideoPreview: React.FC<VideoPreviewProps> = ({video, cues, style}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [animationTick, setAnimationTick] = useState(0);
  const activeCue = useMemo(() => getActiveCue(cues, currentMs), [cues, currentMs]);

  useEffect(() => {
    setCurrentMs(0);
  }, [video.previewUrl, cues]);

  useEffect(() => {
    setAnimationTick((value) => value + 1);
  }, [activeCue?.id]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    let frameId = 0;

    const updateTime = () => {
      setCurrentMs(element.currentTime * 1000);
    };

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

  const boxStyle = getSubtitleBoxStyle(style);

  return (
    <div className="video-preview-shell" style={{aspectRatio: `${video.width}/${video.height}`}}>
      <video
        ref={videoRef}
        className="video-preview-element"
        controls
        src={video.previewUrl}
        onTimeUpdate={(event) => setCurrentMs(event.currentTarget.currentTime * 1000)}
      />
      <div className="video-preview-overlay">
        {activeCue ? (
          <div
            key={`${activeCue.id}-${animationTick}`}
            className="video-preview-subtitle"
            style={{
              ...boxStyle,
              transform: 'scale(1)',
              animation: 'subtitle-pop 240ms ease-out',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.35)',
              letterSpacing: '-0.03em',
            }}
          >
            {activeCue.text}
          </div>
        ) : null}
      </div>
    </div>
  );
};
