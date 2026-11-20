import React, { useState } from 'react';
import { CourseVariable, TextNode } from '../../../types/schema';
import { interpolateVariables } from '../../../utils/variableInterpolator';

interface Props {
  node: TextNode;
  isSelected: boolean;
  canEditOnDoubleClick?: boolean;
  variables?: CourseVariable[];
  showVariablePreview?: boolean;
  onUpdateContent: (content: string) => void;
}

export const TextNodeRenderer: React.FC<Props> = ({
  node,
  isSelected,
  canEditOnDoubleClick = true,
  variables = [],
  showVariablePreview = true,
  onUpdateContent,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!canEditOnDoubleClick) {
      return;
    }
    e.stopPropagation();
    if (node.isLocked) return;
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

  const hasVariables = Boolean(node.content && node.content.includes('{{'));
  const displayedText =
    hasVariables && showVariablePreview
      ? interpolateVariables(node.content, variables)
      : node.content;

  return (
    <div
      className={`w-full h-full relative select-none cursor-move transition-shadow ${fontWeightClass}`}
      onDoubleClick={handleDoubleClick}
      style={{
        color: node.color || '#0f172a',
        fontSize: `${node.fontSize || 16}px`,
        fontFamily: node.fontFamily || undefined,
        textAlign: node.textAlign || 'left',
        backgroundColor: node.backgroundColor || 'transparent',
        borderRadius: node.borderRadius ? `${node.borderRadius}px` : undefined,
        padding: node.padding ? `${node.padding}px` : '4px',
        lineHeight: node.lineHeight || 1.3,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {hasVariables && !isEditing && isSelected && (
        <span
          className="absolute -top-5 right-0 px-1.5 py-0.5 rounded bg-sky-950/95 border border-sky-500/60 text-[9px] font-mono text-sky-300 pointer-events-none z-20"
          title="Contains dynamic variables (double-click to edit raw template)"
        >
          {'{{var}}'} {showVariablePreview ? 'Live' : 'Raw'}
        </span>
      )}

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
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div>{displayedText || 'Click twice to edit text'}</div>
      )}
    </div>
  );
};
