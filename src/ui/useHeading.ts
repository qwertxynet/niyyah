import { useCallback, useEffect, useRef, useState } from 'react';
import { normalize } from '../domain/qibla';

/**
 * - checking: listening, no reading yet
 * - active: live compass readings
 * - needs-permission: the platform (iOS Safari) wants a tap before it shares motion
 * - denied: the user refused motion access
 * - unsupported: no compass (desktop, or a phone without a magnetometer)
 */
export type HeadingState = 'checking' | 'active' | 'needs-permission' | 'denied' | 'unsupported';

interface CompassEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

type PermissionApi = { requestPermission?: () => Promise<'granted' | 'denied'> };

function screenAngle(): number {
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

/** Live device heading in degrees clockwise from north, smoothed. */
export function useHeading(): { heading: number | null; state: HeadingState; request: () => void } {
  const [heading, setHeading] = useState<number | null>(null);
  const [state, setState] = useState<HeadingState>('checking');
  const [listening, setListening] = useState(false);
  // Smooth on the unit circle so 359° → 1° doesn't swing the long way round.
  const vector = useRef<{ x: number; y: number } | null>(null);

  // Only phones and tablets have a compass worth asking for. Some desktop
  // browsers expose the iOS-style permission API too, and asking there just
  // produces a confusing "refused".
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  // Chromium (and so the Android WebView) also exposes requestPermission but
  // delivers readings without it, so listen first and only ask when nothing
  // arrives — which is what iOS does until the user taps.
  const canAsk =
    touch &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as PermissionApi).requestPermission === 'function';

  useEffect(() => {
    if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined' || !touch) {
      setState('unsupported');
      return;
    }

    let gotReading = false;
    let frame = 0;
    let pending: number | null = null;

    const push = (raw: number) => {
      const rad = (normalize(raw + screenAngle()) * Math.PI) / 180;
      const next = { x: Math.cos(rad), y: Math.sin(rad) };
      const prev = vector.current;
      const k = 0.22;
      vector.current = prev ? { x: prev.x + (next.x - prev.x) * k, y: prev.y + (next.y - prev.y) * k } : next;
      pending = normalize((Math.atan2(vector.current.y, vector.current.x) * 180) / Math.PI);
      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          if (pending !== null) setHeading(pending);
        });
      }
      if (!gotReading) {
        gotReading = true;
        setState('active');
      }
    };

    const onAbsolute = (event: DeviceOrientationEvent) => {
      if (event.alpha === null) return;
      push(360 - event.alpha);
    };

    const onRelative = (event: CompassEvent) => {
      if (typeof event.webkitCompassHeading === 'number' && event.webkitCompassHeading >= 0) {
        push(event.webkitCompassHeading);
      } else if (event.absolute && event.alpha !== null) {
        push(360 - event.alpha);
      }
    };

    const hasAbsolute = 'ondeviceorientationabsolute' in window;
    if (hasAbsolute) window.addEventListener('deviceorientationabsolute', onAbsolute as EventListener);
    else window.addEventListener('deviceorientation', onRelative as EventListener);

    // Desktops expose the API but never deliver a heading.
    const timeout = window.setTimeout(() => {
      if (gotReading) return;
      setState(canAsk && !listening ? 'needs-permission' : 'unsupported');
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('deviceorientationabsolute', onAbsolute as EventListener);
      window.removeEventListener('deviceorientation', onRelative as EventListener);
    };
  }, [listening, canAsk, touch]);

  const request = useCallback(() => {
    const api = DeviceOrientationEvent as unknown as PermissionApi;
    if (!api.requestPermission) {
      setState('checking');
      setListening(true);
      return;
    }
    api
      .requestPermission()
      .then((result) => {
        if (result === 'granted') {
          setState('checking');
          setListening(true);
        } else setState('denied');
      })
      .catch(() => setState('denied'));
  }, []);

  return { heading, state, request };
}
