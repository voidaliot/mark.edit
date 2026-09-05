import { useEffect, useRef, useState } from 'react';
import { exportDiagramSvg } from '../../platform/diagramExport';
import { renderDiagram } from './diagramRenderer';
import type { DiagramSource } from './diagramSource';
import './diagrams.css';

type RenderedDiagram = { svg: string; url: string; width: number; height: number };

export function DiagramPreview({ diagram, index, title }: {
  diagram: DiagramSource; index: number; title: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [rendered, setRendered] = useState<RenderedDiagram | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const label = diagram.format === 'mermaid' ? 'Mermaid' : 'PlantUML';

  useEffect(() => {
    if (!rootRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    let url: string | undefined;
    // Short debounce avoids loading an engine for each keystroke in split view.
    const timeout = window.setTimeout(() => {
      void renderDiagram(diagram.format, diagram.source, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' }));
        setRendered({ ...result, url });
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
      });
    }, 150);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [visible, diagram.format, diagram.source, revision]);

  const changeZoom = (delta: number) => {
    if (!rendered) return;
    const current = zoom ?? (imageRef.current?.getBoundingClientRect().width ?? rendered.width) / rendered.width;
    setZoom(Math.max(0.25, Math.min(4, current + delta)));
  };

  const copySource = async () => {
    try {
      await navigator.clipboard.writeText(diagram.source);
      setActionMessage('Source copied');
    } catch { setActionMessage('Could not copy the source'); }
  };

  const exportSvg = async () => {
    if (!rendered) return;
    const filename = `${title.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*]|\p{Cc}/gu, '_') || 'diagram'}-${index + 1}.svg`;
    try {
      if (await exportDiagramSvg(rendered.svg, filename)) setActionMessage('SVG exported');
    } catch (reason) {
      setActionMessage(`Could not export: ${reason instanceof Error ? reason.message : String(reason)}`);
    }
  };

  return (
    <section className="diagram" ref={rootRef} aria-label={`${label} diagram ${index + 1}`}>
      <div className="diagram-toolbar">
        <strong>{label}</strong>
        <div className="diagram-controls">
          <button type="button" onClick={() => changeZoom(-0.25)} disabled={!rendered || (zoom !== null && zoom <= 0.25)} aria-label="Zoom out">−</button>
          <span className="diagram-zoom">{zoom === null ? 'Fit' : `${Math.round(zoom * 100)}%`}</span>
          <button type="button" onClick={() => changeZoom(0.25)} disabled={!rendered || (zoom !== null && zoom >= 4)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => setZoom(null)} disabled={!rendered}>Fit</button>
          <button type="button" onClick={exportSvg} disabled={!rendered}>Export SVG</button>
        </div>
      </div>
      {error ? (
        <div className="diagram-error" role="alert">
          <strong>Could not render this diagram</strong>
          <pre>{error}</pre>
          <button type="button" onClick={() => { setError(''); setRendered(null); setRevision((value) => value + 1); }}>Retry</button>
        </div>
      ) : rendered ? (
        <div className="diagram-viewport" tabIndex={0} role="region" aria-label={`${label} preview`}>
          <img ref={imageRef} src={rendered.url} alt={`${label} diagram ${index + 1}; text available under Source`}
            style={{ width: zoom === null ? `min(100%, ${rendered.width}px)` : `${rendered.width * zoom}px` }}
            onError={() => { setRendered(null); setError('The diagram image could not be displayed.'); }} />
        </div>
      ) : (
        <div className="diagram-loading" role="status">{visible ? `Rendering ${label}…` : 'Diagram preview loads when visible'}</div>
      )}
      <details open={error ? true : undefined}>
        <summary>Source</summary>
        <button type="button" className="diagram-copy" onClick={copySource}>Copy source</button>
        <pre className="diagram-source"><code>{diagram.source}</code></pre>
      </details>
      {actionMessage && <p className="diagram-message" role="status">{actionMessage}</p>}
    </section>
  );
}
