export type VideoCaptionTrack = {
  src: string;
  label: string;
  srclang?: string;
  default?: boolean;
};

export function VideoPlayer({
  embedUrl,
  src,
  title,
  tracks,
}: {
  embedUrl?: string;
  src?: string;
  title: string;
  tracks?: VideoCaptionTrack[];
}) {
  if (src) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <video controls className="h-full w-full" title={title} playsInline>
          <source src={src} />
          {tracks?.map((track) => (
            <track
              key={track.src}
              kind="captions"
              src={track.src}
              label={track.label}
              srcLang={track.srclang || 'en'}
              default={track.default}
            />
          ))}
        </video>
      </div>
    );
  }

  if (
    !embedUrl ||
    (!embedUrl.startsWith('https://www.youtube-nocookie.com/embed/') &&
      !embedUrl.startsWith('https://player.vimeo.com/video/'))
  ) {
    return (
      <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
        This video could not be loaded.
      </p>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      <iframe
        src={`${embedUrl}?rel=0`}
        title={title}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
