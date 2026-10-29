import React, { useState } from 'react';
import { TextNode } from '../../../types/schema';

interface Props {
  node: TextNode;
  isSelected: boolean;
  onUpdateContent: (content: string) => void;
}

export const TextNodeRenderer: React.FC<Props> = ({ node, isSelected, onUpdateContent }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsEditing(false);
    onUpdateContent(e.target.value);
  };

  const fontWeightClass =
    node.fontWeight === 'bold'
      ? 'font-bold'
      : node.fontWeight === 'black'
      ? 'font-black'
      : node.fontWeight === 'semibold'
      ? 'font-semibold'
      : 'font-normal';

  return (
    <div
      className={`w-full h-full relative select-none cursor-move transition-shadow ${fontWeightClass}`}
      onDoubleClick={handleDoubleClick}
      style={{
        color: node.color || '#0f172a',
        fontSize: `${node.fontSize || 16}px`,
        textAlign: node.textAlign || 'left',
        backgroundColor: node.backgroundColor || 'transparent',
        borderRadius: node.borderRadius ? `${node.borderRadius}px` : undefined,
        padding: node.padding ? `${node.padding}px` : '4px',
        lineHeight: 1.3,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {isEditing ? (
        <textarea
          autoFocus
          className="w-full h-full bg-white/90 border border-blue-500 rounded p-1 outline-none text-slate-900 resize-none font-inherit text-inherit"
          defaultValue={node.content}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div>{node.content || 'Click twice to edit text'}</div>
      )}
    </div>
  );
};
