import React from 'react';
import { ShapeNode } from '../../../types/schema';

interface Props {
  node: ShapeNode;
}

export const ShapeNodeRenderer: React.FC<Props> = ({ node }) => {
  const isCircle = node.shapeType === 'circle';

  return (
    <div
      className="w-full h-full cursor-move transition-all"
      style={{
        backgroundColor: node.fill || '#3b82f6',
        borderRadius: isCircle ? '50%' : node.borderRadius ? `${node.borderRadius}px` : '8px',
        opacity: node.opacity ?? 1,
        border: node.stroke
          ? `${node.strokeWidth || 1}px solid ${node.stroke}`
          : undefined,
      }}
    />
  );
};
