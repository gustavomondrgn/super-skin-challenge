import { useCallback, useEffect, useRef, useState } from "react";
import { createCelebrationAudio, type CelebrationAudio } from "./celebration-audio";

export function useCelebrationMusic(open: boolean) {
  const audioRef = useRef<CelebrationAudio | null>(null);
  const requestRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [supported] = useState(() => createCelebrationAudio().supported);

  const stop = useCallback(() => {
    requestRef.current += 1;
    audioRef.current?.stop();
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    const request = ++requestRef.current;
    audioRef.current ??= createCelebrationAudio(() => setPlaying(false));
    // Keep start() synchronous with the click; resume needs a user gesture on mobile.
    void audioRef.current.start().then((started) => {
      if (request === requestRef.current) setPlaying(started);
    });
  }, []);

  useEffect(() => {
    if (!open) stop();
  }, [open, stop]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", stop);
      requestRef.current += 1;
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, [stop]);

  return { supported, playing, play, stop };
}
