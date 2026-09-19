
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  progress?: number | null;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, progress }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 border border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        {progress !== undefined && progress !== null && (
          <div className="w-full bg-gray-700 h-1">
            <div 
              className="bg-violet-500 h-1 transition-all duration-300" 
              style={{width: `${progress}%`}}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;