import React from 'react';
import { SlideLayout } from '../../data/slideLayouts';

interface TemplatePreviewThumbnailProps {
  layout: SlideLayout;
}

export const TemplatePreviewThumbnail: React.FC<TemplatePreviewThumbnailProps> = ({ layout }) => {
  const canvasWidth = 960;
  const canvasHeight = 540;

  return (
    <div className="w-56 h-32 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl relative select-none pointer-events-none">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: layout.background.value,
          backgroundSize: 'cover',
        }}
      />

      {/* Render miniature nodes proportionally */}
      <div className="absolute inset-0">
        {layout.nodes.map((node, i) => {
          const leftPct = (node.x / canvasWidth) * 100;
          const topPct = (node.y / canvasHeight) * 100;
          const widthPct = (node.width / canvasWidth) * 100;
          const heightPct = (node.height / canvasHeight) * 100;

          if (node.type === 'text') {
            const isHeading = (node as any).fontSize >= 24;
            return (
              <div
                key={i}
                className="absolute flex flex-col justify-center overflow-hidden"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                <div
                  className="rounded"
                  style={{
                    backgroundColor: (node as any).color || '#ffffff',
                    opacity: isHeading ? 0.9 : 0.6,
                    height: isHeading ? '30%' : '18%',
                    width: isHeading ? '80%' : '100%',
                  }}
                />
                {!isHeading && (
                  <div
                    className="rounded mt-0.5"
                    style={{
                      backgroundColor: (node as any).color || '#cbd5e1',
                      opacity: 0.4,
                      height: '18%',
                      width: '60%',
                    }}
                  />
                )}
              </div>
            );
          }

          if (node.type === 'shape') {
            return (
              <div
                key={i}
                className="absolute rounded"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  backgroundColor: (node as any).fill || '#3b82f6',
                  opacity: (node as any).opacity || 0.8,
                  borderRadius:
                    (node as any).shapeType === 'circle'
                      ? '9999px'
                      : (node as any).shapeType === 'badge'
                      ? '9999px'
                      : '4px',
                }}
              />
            );
          }

          if (node.type === 'image') {
            return (
              <div
                key={i}
                className="absolute rounded bg-slate-800 border border-slate-700/60 flex items-center justify-center overflow-hidden"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                {(node as any).url ? (
                  <img
                    src={(node as any).url}
                    alt=""
                    className="w-full h-full object-cover opacity-75"
                  />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-blue-400 opacity-60" />
                )}
              </div>
            );
          }

          if (node.type === 'quiz') {
            return (
              <div
                key={i}
                className="absolute rounded border border-blue-500/40 bg-slate-900/90 p-1 flex flex-col gap-1 justify-center"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                <div className="w-3/4 h-1.5 bg-blue-400 rounded-sm" />
                <div className="w-full h-1 bg-slate-700 rounded-sm" />
                <div className="w-full h-1 bg-slate-700 rounded-sm" />
              </div>
            );
          }

          if (node.type === 'callout') {
            return (
              <div
                key={i}
                className="absolute rounded border-l-2 border-amber-500 bg-amber-950/40 p-0.5"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                <div className="w-1/2 h-1 bg-amber-400 rounded-sm mb-0.5" />
                <div className="w-4/5 h-0.5 bg-amber-200/50 rounded-sm" />
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Floating Layout Info Badge */}
      <div className="absolute bottom-1 right-1 bg-slate-900/90 border border-slate-700/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-300 backdrop-blur-sm">
        {layout.nodes.length} nodes
      </div>
    </div>
  );
};
