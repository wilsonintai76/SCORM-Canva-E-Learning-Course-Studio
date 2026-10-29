import React from 'react';
import { ImageNode } from '../../../types/schema';
import { Image as ImageIcon } from 'lucide-react';

interface Props {
  node: ImageNode;
  isSelected: boolean;
}

export const ImageNodeRenderer: React.FC<Props> = ({ node }) => {
  return (
    <div
      className="w-full h-full relative overflow-hidden select-none cursor-move"
      style={{
        borderRadius: `${node.borderRadius || 0}px`,
        opacity: node.opacity ?? 1,
        boxShadow: node.shadow ? '0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -4px rgba(0, 0, 0, 0.1)' : undefined,
        border: node.borderWidth ? `${node.borderWidth}px solid ${node.borderColor || '#cbd5e1'}` : undefined,
      }}
    >
      {node.url ? (
        <img
          src={node.url}
          alt={node.alt || 'Course Asset'}
          className="w-full h-full pointer-events-none"
          style={{ objectFit: node.objectFit || 'cover' }}
          loading="lazy"
          onError={(e) => {
            // Fallback placeholder
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80';
          }}
        />
      ) : (
        <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
          <ImageIcon className="w-8 h-8 mb-1" />
          <span className="text-xs">No image URL</span>
        </div>
      )}
    </div>
  );
};
