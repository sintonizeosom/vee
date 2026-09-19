
import React from 'react';

interface SplitterProps {
  direction: 'vertical' | 'horizontal';
  onDrag: (e: React.MouseEvent | React.TouchEvent) => void;
  className?: string;
}

const Splitter: React.FC<SplitterProps> = ({ direction, onDrag, className = '' }) => {
  const isVertical = direction === 'vertical';
  return (
    <div
      onMouseDown={onDrag}
      onTouchStart={onDrag}
      className={`flex-shrink-0 bg-gray-700 hover:bg-violet-600 transition-colors z-20 ${
        isVertical
          ? 'w-1 cursor-col-resize'
          : 'h-1 cursor-row-resize'
      } ${className}`}
      style={{
        userSelect: 'none',
      }}
    />
  );
};

export default Splitter;
