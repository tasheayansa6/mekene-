import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function isSafeHref(href?: string) {
  if (!href) return false;
  return (
    href.startsWith('/') ||
    href.startsWith('https://') ||
    href.startsWith('http://') ||
    href.startsWith('mailto:')
  );
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-base leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-primary [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-primary [&_h3]:text-xl [&_h3]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:p-2 [&_td]:p-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a({ href, children }) {
            if (!isSafeHref(href)) return <span>{children}</span>;
            const external = href?.startsWith('http');
            return (
              <a href={href} rel={external ? 'noopener noreferrer' : undefined} target={external ? '_blank' : undefined}>
                {children}
              </a>
            );
          },
          img({ src, alt }) {
            if (!src || !(src.startsWith('/uploads/') || src.startsWith('https://') || src.startsWith('http://'))) {
              return null;
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt || ''} className="rounded-lg" />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
