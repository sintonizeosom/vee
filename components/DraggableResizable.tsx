import React, { useCallback, useEffect, useRef, useState } from 'react';
import { VideoClip } from '../types';

interface DraggableResizableProps {
  children?: React.ReactNode;
  element: VideoClip;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent | React.TouchEvent) => void;
  onUpdate: (id: string, props: Partial<VideoClip>) => void;
  interactionScale: number;
  containerId: string;
  bounds: { width: number; height: number };
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  zIndex: number;
  initialDisplay?: 'block' | 'none';
  isGroupDragging?: boolean;
}

const MIN_SIZE = 20;

const DraggableResizable: React.FC<DraggableResizableProps> = (props) => {
  const { children, element, isSelected, initialDisplay = 'block', onUpdate, onInteractionStart, onInteractionEnd, onSelect, interactionScale, zIndex, isGroupDragging } = props;
  
  const selfRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef({ wasDragged: false });
  
  const [action, setAction] = useState<{
    type: string;
    initialMouseX: number;
    initialMouseY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialRotation: number;
    initialFontSize?: number;
    centerX?: number;
    centerY?: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent, actionType: string) => {
    if (isGroupDragging) return;
    // For resize handles, we stop propagation immediately.
    // For move, we let the onClick handler logic decide based on whether it was a drag.
    if (actionType !== 'move') {
      e.stopPropagation();
    }
    
    dragInfo.current.wasDragged = false;
    onInteractionStart();
    
    const currentRef = selfRef.current;
    if (!currentRef) return;
    const rect = currentRef.getBoundingClientRect();
    
    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;

    setAction({
      type: actionType,
      initialMouseX: point.clientX,
      initialMouseY: point.clientY,
      initialX: element.x,
      initialY: element.y,
      initialWidth: element.width,
      initialHeight: element.height,
      initialRotation: element.rotation,
      initialFontSize: 'fontSize' in element ? element.fontSize : undefined,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
  }, [onInteractionStart, element, isGroupDragging]);

  useEffect(() => {
    if (!action) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
        const point = 'touches' in e ? e.touches[0] : e;
        if (!point) return;
        
        if (!dragInfo.current.wasDragged) {
            const dx = Math.abs(point.clientX - action.initialMouseX);
            const dy = Math.abs(point.clientY - action.initialMouseY);
            if (dx > 3 || dy > 3) {
                dragInfo.current.wasDragged = true;
            }
        }
        
        if ('touches' in e && e.cancelable) e.preventDefault();

        const { type, initialMouseX, initialMouseY, initialX, initialY, initialWidth, initialHeight, initialFontSize, centerX, centerY, initialRotation } = action;

        const dx = (point.clientX - initialMouseX) / interactionScale;
        const dy = (point.clientY - initialMouseY) / interactionScale;
        
        let newProps: Partial<VideoClip> = {};

        if (type === 'move') {
            const newX = initialX + dx;
            const newY = initialY + dy;
            newProps = { x: newX, y: newY };

        } else if (type === 'rotate') {
             if (centerX === undefined || centerY === undefined) return;
            
            const initialAngle = Math.atan2(initialMouseY - centerY, initialMouseX - centerX);
            const currentAngle = Math.atan2(point.clientY - centerY, point.clientX - centerX);
            const angleDelta = currentAngle - initialAngle;

            newProps = { rotation: initialRotation + (angleDelta * (180 / Math.PI)) };
        } else {
            const rotationRad = (element.rotation || 0) * (Math.PI / 180);
            const cos = Math.cos(rotationRad);
            const sin = Math.sin(rotationRad);

            const dxRot = dx * cos + dy * sin;
            const dyRot = -dx * sin + dy * cos;
            
            let widthChange = 0;
            if (type.includes('l')) widthChange = -dxRot;
            else if (type.includes('r')) widthChange = dxRot;

            let heightChange = 0;
            if (type.includes('t')) heightChange = -dyRot;
            else if (type.includes('b')) heightChange = dyRot;

            let newWidth = initialWidth + widthChange;
            let newHeight = initialHeight + heightChange;

            if (newWidth < MIN_SIZE) {
                widthChange += MIN_SIZE - newWidth;
                newWidth = MIN_SIZE;
            }
            if (newHeight < MIN_SIZE) {
                heightChange += MIN_SIZE - newHeight;
                newHeight = MIN_SIZE;
            }

            let cxChange = 0;
            if(type.includes('l')) cxChange = -widthChange / 2;
            if(type.includes('r')) cxChange = widthChange / 2;
            
            let cyChange = 0;
            if(type.includes('t')) cyChange = -heightChange / 2;
            if(type.includes('b')) cyChange = heightChange / 2;

            const rotatedCxChange = cxChange * cos - cyChange * sin;
            const rotatedCyChange = cxChange * sin + cyChange * cos;

            const initialCenterX = initialX + initialWidth / 2;
            const initialCenterY = initialY + initialHeight / 2;
            
            const newCenterX = initialCenterX + rotatedCxChange;
            const newCenterY = initialCenterY + rotatedCyChange;
            
            let finalX = newCenterX - newWidth / 2;
            let finalY = newCenterY - newHeight / 2;
            
            newProps = {
                width: Math.max(MIN_SIZE, newWidth),
                height: Math.max(MIN_SIZE, newHeight),
                x: finalX,
                y: finalY,
            };

            if (element.type === 'text' && 'fontSize' in element && initialHeight > 0) {
                const originalFontSize = initialFontSize || 24;
                const ratio = originalFontSize / initialHeight;
                const newFontSize = newHeight * ratio;
                (newProps as Partial<VideoClip>).fontSize = Math.round(Math.max(8, newFontSize));
            }
        }
        
        onUpdate(element.id, newProps);
    };

    const handlePointerUp = () => {
      onInteractionEnd();
      setAction(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [action, onUpdate, onInteractionEnd, element, interactionScale]);

  const resizeHandles = ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'];
  
  return (
    <div
      ref={selfRef}
      style={{
        display: initialDisplay,
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        transformOrigin: 'center center',
        cursor: isSelected ? 'move' : 'pointer',
        pointerEvents: 'auto',
        zIndex: isSelected ? zIndex + 1000 : zIndex,
        touchAction: 'none',
      }}
      className="draggable-resizable-wrapper select-none"
      data-element-id={element.id}
      data-element-type={element.type}
      onMouseDown={(e) => handlePointerDown(e, 'move')}
      onTouchStart={(e) => handlePointerDown(e, 'move')}
      onClick={(e) => {
        if (dragInfo.current.wasDragged) {
          e.stopPropagation();
          return;
        }
        if (!isSelected) {
            e.stopPropagation();
            onSelect(e);
        }
        // If it's already selected and wasn't a drag, it's a true click.
        // Let the event bubble up to the canvas background, which will handle
        // deselection or selecting an item underneath.
      }}
    >
      <div className="w-full h-full"
        style={{
          outline: isSelected ? `2px solid #8b5cf6` : 'none',
          outlineOffset: '4px',
        }}
      >
        {children}
      </div>
      {isSelected && (
        <>
          {resizeHandles.map(handle => {
            const cursorMap: { [key: string]: string } = {
                tl: 'cursor-nwse-resize', tr: 'cursor-nesw-resize',
                bl: 'cursor-nesw-resize', br: 'cursor-nwse-resize',
                t: 'cursor-ns-resize', b: 'cursor-ns-resize',
                l: 'cursor-ew-resize', r: 'cursor-ew-resize',
            };
            return (
                <div
                    key={handle}
                    className={`absolute w-4 h-4 bg-white rounded-full shadow-lg border-[3px] border-violet-500 -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform ${cursorMap[handle]}`}
                    style={{
                        top: handle.includes('t') ? '0%' : handle.includes('b') ? '100%' : '50%',
                        left: handle.includes('l') ? '0%' : handle.includes('r') ? '100%' : '50%',
                        touchAction: 'none',
                    }}
                    onMouseDown={(e) => handlePointerDown(e, handle)}
                    onTouchStart={(e) => handlePointerDown(e, handle)}
                />
            );
          })}
           <div 
            className="absolute left-1/2 -translate-x-1/2 cursor-alias"
            style={{ bottom: '-32px', height: '24px', width: '24px', touchAction: 'none' }}
            onMouseDown={(e) => handlePointerDown(e, 'rotate')}
            onTouchStart={(e) => handlePointerDown(e, 'rotate')}
          >
            <div className="w-px h-full bg-violet-400 mx-auto"></div>
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-[3px] border-violet-500 hover:scale-125 transition-transform"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(DraggableResizable);