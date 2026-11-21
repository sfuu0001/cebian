import React, { useLayoutEffect, useRef } from 'react';

export interface LiveStrokeIconProps {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  wrapperClassName?: string;
  /** Increment or change this value to replay the real-time stroke-path draw */
  drawKey?: string | number;
  /** When true, holds strokes hidden until revealed */
  paused?: boolean;
  /** Initial delay before the first stroke begins (ms) */
  delayMs?: number;
  /** Stagger between consecutive paths inside the SVG (ms) */
  staggerMs?: number;
  /** Duration for each individual path stroke (ms) */
  durationMs?: number;
  /** Whether to trace strokes with accent #3BB4FE before settling to currentColor */
  accentTrace?: boolean;
  /** Gentle breathing float when active */
  breathe?: boolean;
}

const STROKE_SELECTOR = 'path, rect, circle, line, polyline, polygon, ellipse';

export const LiveStrokeIcon: React.FC<LiveStrokeIconProps> = ({
  icon: Icon,
  className = 'w-4 h-4',
  wrapperClassName = '',
  drawKey = 0,
  paused = false,
  delayMs = 0,
  staggerMs = 58,
  durationMs = 420,
  accentTrace = true,
  breathe = false
}) => {
  const hostRef = useRef<HTMLSpanElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const configRef = useRef({ delayMs, staggerMs, durationMs, accentTrace });
  configRef.current = { delayMs, staggerMs, durationMs, accentTrace };

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Cancel any previous stroke animations cleanly
    animationsRef.current.forEach((anim) => {
      try {
        anim.cancel();
      } catch {
        // Ignore already-finished animations
      }
    });
    animationsRef.current = [];

    const shapes = Array.from(host.querySelectorAll<SVGGeometryElement>(STROKE_SELECTOR));
    if (shapes.length === 0) return;

    const {
      delayMs: curDelay,
      staggerMs: curStagger,
      durationMs: curDuration,
      accentTrace: useAccent
    } = configRef.current;

    if (paused) {
      shapes.forEach((shape) => {
        let len = 28;
        try {
          if (typeof shape.getTotalLength === 'function') {
            len = Math.max(shape.getTotalLength(), 2);
          }
        } catch {
          len = 28;
        }
        shape.style.strokeDasharray = `${len}`;
        shape.style.strokeDashoffset = `${len}`;
        shape.style.opacity = '0';
      });
      return;
    }

    const totalShapes = shapes.length;
    const effectiveStagger =
      totalShapes > 1 ? Math.min(curStagger, Math.floor(240 / (totalShapes - 1))) : 0;

    shapes.forEach((shape, idx) => {
      let len = 28;
      try {
        if (typeof shape.getTotalLength === 'function') {
          len = Math.max(shape.getTotalLength(), 2);
        }
      } catch {
        len = 28;
      }

      shape.style.strokeDasharray = `${len}`;
      shape.style.strokeDashoffset = `${len}`;
      shape.style.opacity = '';

      if (typeof shape.animate !== 'function') {
        shape.style.strokeDasharray = '';
        shape.style.strokeDashoffset = '';
        return;
      }

      const keyframes: Keyframe[] = useAccent
        ? [
            {
              strokeDashoffset: len,
              opacity: 0.15,
              stroke: '#3BB4FE',
              offset: 0
            },
            {
              strokeDashoffset: len * 0.42,
              opacity: 1,
              stroke: '#3BB4FE',
              offset: 0.45
            },
            {
              strokeDashoffset: 0,
              opacity: 1,
              stroke: 'currentColor',
              offset: 1
            }
          ]
        : [
            {
              strokeDashoffset: len,
              opacity: 0.2,
              offset: 0
            },
            {
              opacity: 1,
              offset: 0.35
            },
            {
              strokeDashoffset: 0,
              opacity: 1,
              offset: 1
            }
          ];

      const anim = shape.animate(keyframes, {
        duration: curDuration,
        delay: curDelay + idx * effectiveStagger,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both'
      });

      anim.onfinish = () => {
        shape.style.strokeDasharray = '';
        shape.style.strokeDashoffset = '';
        shape.style.opacity = '';
        try {
          anim.cancel();
        } catch {
          // Ignore
        }
      };

      animationsRef.current.push(anim);
    });

    return () => {
      animationsRef.current.forEach((anim) => {
        try {
          anim.cancel();
        } catch {
          // Ignore
        }
      });
      animationsRef.current = [];
    };
  }, [drawKey, paused]);

  return (
    <span
      ref={hostRef}
      className={`inline-flex items-center justify-center shrink-0 ${
        breathe ? 'live-icon-breathe' : ''
      } ${wrapperClassName}`}
    >
      <Icon className={className} />
    </span>
  );
};
