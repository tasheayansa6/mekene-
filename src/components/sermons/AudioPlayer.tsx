'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPlayerTime } from '@/lib/sermons/player';
import { apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const SKIP_SECONDS = 15;
const PROGRESS_DEBOUNCE_MS = 5000;

export type ChurchAudioPlayerProps = {
  src: string;
  title: string;
  sermonSlug?: string;
  sermonId?: string;
  initialPosition?: number;
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  showDownload?: boolean;
  downloadHref?: string;
};

export function ChurchAudioPlayer({
  src,
  title,
  sermonSlug,
  sermonId,
  initialPosition = 0,
  onProgress,
  showDownload,
  downloadHref,
}: ChurchAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playRecorded = useRef(false);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { status } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialSeekDone, setInitialSeekDone] = useState(false);

  const persistProgress = useCallback(
    (pos: number, dur: number) => {
      onProgress?.(pos, dur);
      if (status !== 'authenticated' || !sermonId) return;
      if (progressTimer.current) clearTimeout(progressTimer.current);
      progressTimer.current = setTimeout(() => {
        void apiPost('/member/library/progress', {
          sermonId,
          positionSeconds: pos,
          durationSeconds: dur,
        });
      }, PROGRESS_DEBOUNCE_MS);
    },
    [onProgress, sermonId, status]
  );

  const recordPlay = useCallback(() => {
    if (playRecorded.current || !sermonSlug) return;
    playRecorded.current = true;
    void apiPost(`/library/sermons/${encodeURIComponent(sermonSlug)}/play`);
  }, [sermonSlug]);

  useEffect(() => {
    const node = audioRef.current;
    if (!node) return;
    const onLoaded = () => {
      const dur = node.duration || 0;
      setDuration(dur);
      setLoading(false);
      if (!initialSeekDone && initialPosition > 0 && dur > initialPosition) {
        node.currentTime = initialPosition;
        setCurrent(initialPosition);
        setInitialSeekDone(true);
      }
    };
    const onTime = () => {
      const pos = node.currentTime || 0;
      const dur = node.duration || duration;
      setCurrent(pos);
      if (playing) persistProgress(pos, dur);
    };
    const onEnd = () => setPlaying(false);
    const onError = () => {
      setLoading(false);
      setError('This audio file could not be played.');
    };
    node.addEventListener('loadedmetadata', onLoaded);
    node.addEventListener('timeupdate', onTime);
    node.addEventListener('ended', onEnd);
    node.addEventListener('error', onError);
    return () => {
      node.removeEventListener('loadedmetadata', onLoaded);
      node.removeEventListener('timeupdate', onTime);
      node.removeEventListener('ended', onEnd);
      node.removeEventListener('error', onError);
      if (progressTimer.current) clearTimeout(progressTimer.current);
    };
  }, [src, initialPosition, initialSeekDone, playing, persistProgress, duration]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  function skip(delta: number) {
    const node = audioRef.current;
    if (!node) return;
    const next = Math.max(0, Math.min(node.duration || 0, (node.currentTime || 0) + delta));
    node.currentTime = next;
    setCurrent(next);
  }

  async function togglePlay() {
    const node = audioRef.current;
    if (!node) return;
    if (playing) {
      node.pause();
      setPlaying(false);
      persistProgress(node.currentTime || 0, node.duration || duration);
      return;
    }
    try {
      await node.play();
      setPlaying(true);
      recordPlay();
    } catch {
      setError('Unable to start audio playback.');
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <audio ref={audioRef} src={src} preload="metadata" />
      <p className="mb-3 text-sm font-medium">{title}</p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={() => void togglePlay()}
              aria-label={playing ? 'Pause audio' : 'Play audio'}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              <span className="ml-2">{playing ? 'Pause' : 'Play'}</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Skip back 15 seconds"
              onClick={() => skip(-SKIP_SECONDS)}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Skip forward 15 seconds"
              onClick={() => skip(SKIP_SECONDS)}
            >
              <RotateCw className="size-4" />
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Playback speed</span>
              <Select
                value={String(speed)}
                onValueChange={(value) => setSpeed(Number(value))}
              >
                <SelectTrigger className="h-8 w-[5.5rem]" aria-label="Playback speed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPEEDS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <span className="text-sm tabular-nums text-muted-foreground">
              {loading ? 'Loading…' : `${formatPlayerTime(current)} / ${formatPlayerTime(duration)}`}
            </span>
          </div>
          <label className="block text-sm">
            <span className="sr-only">Seek</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              disabled={loading || !duration}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (audioRef.current) audioRef.current.currentTime = next;
                setCurrent(next);
              }}
              className="w-full accent-primary"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={muted ? 'Unmute' : 'Mute'}
              onClick={() => {
                const next = !muted;
                setMuted(next);
                if (audioRef.current) audioRef.current.muted = next;
              }}
            >
              {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </Button>
            <label className="flex flex-1 items-center gap-2 text-sm">
              <span className="sr-only">Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setVolume(next);
                  setMuted(next === 0);
                  if (audioRef.current) {
                    audioRef.current.volume = next;
                    audioRef.current.muted = next === 0;
                  }
                }}
                className="w-full max-w-40 accent-primary"
              />
            </label>
            {showDownload && downloadHref ? (
              <Button asChild variant="outline" size="sm">
                <Link href={downloadHref} aria-label="Download audio">
                  <Download className="mr-2 size-4" />
                  Download
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/** @deprecated Use ChurchAudioPlayer — kept for existing imports */
export function AudioPlayer(props: ChurchAudioPlayerProps) {
  return <ChurchAudioPlayer {...props} />;
}
