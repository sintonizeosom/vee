import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { ProjectFormat } from '../types';
import { FORMAT_DIMENSIONS } from '../constants';
import { Video, X } from 'lucide-react';

type Quality = '480p' | '720p' | '1080p';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: { width: number; height: number; quality: Quality; fps: number }) => void;
  format: ProjectFormat;
}


const ensureEven = (n: number) => Math.round(n / 2) * 2;

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, format }) => {
  const [selectedQuality, setSelectedQuality] = useState<Quality>('720p');
  const [selectedFps, setSelectedFps] = useState<number>(30);
  
  const baseDimensions = FORMAT_DIMENSIONS[format];
  const aspectRatio = baseDimensions.width / baseDimensions.height;

  const qualityOptions = useMemo(() => {
    const isPortrait = aspectRatio < 1;

    if (isPortrait) {
        return {
            '480p': { name: 'SD', width: 480, height: ensureEven(480 / aspectRatio) },
            '720p': { name: 'HD', width: 720, height: ensureEven(720 / aspectRatio) },
            '1080p': { name: 'Full HD', width: 1080, height: ensureEven(1080 / aspectRatio) },
        };
    } else { // Landscape or Square
        return {
            '480p': { name: 'SD', height: 480, width: ensureEven(480 * aspectRatio) },
            '720p': { name: 'HD', height: 720, width: ensureEven(720 * aspectRatio) },
            '1080p': { name: 'Full HD', height: 1080, width: ensureEven(1080 * aspectRatio) },
        };
    }
  }, [aspectRatio]);

  const handleExport = () => {
    onExport({ ...qualityOptions[selectedQuality], quality: selectedQuality, fps: selectedFps });
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center"><Video className="mr-3 text-violet-400"/>Exportar Vídeo</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X size={20}/></button>
        </div>
        
        <p className="text-gray-400 mb-2 text-xs">
          Selecione a qualidade do vídeo. A exportação ocorre em tempo real e levará a duração total da sua música.
        </p>
        <p className="text-xs text-amber-400/80 mb-6">
          A exportação para MP4 requer um navegador moderno (Chrome, Edge).
        </p>

        <div className="space-y-3 mb-6">
            {(Object.keys(qualityOptions) as Quality[]).map(q => (
                <button
                    key={q}
                    onClick={() => setSelectedQuality(q)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${selectedQuality === q ? 'border-violet-500 bg-violet-900/40' : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}`}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="font-bold text-sm">{qualityOptions[q].name}</span>
                            <span className="text-gray-300 ml-2">{q}</span>
                        </div>
                        <span className="text-gray-400 text-sm">{`${qualityOptions[q].width} x ${qualityOptions[q].height}`}</span>
                    </div>
                </button>
            ))}
        </div>
        
        <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Quadros por Segundo (FPS)</h3>
            <div className="grid grid-cols-3 gap-2">
                {[24, 30, 60].map(fps => (
                    <button
                        key={fps}
                        onClick={() => setSelectedFps(fps)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${selectedFps === fps ? 'border-violet-500 bg-violet-900/40' : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}`}
                    >
                        <span className="font-bold text-base">{fps}</span>
                        <span className="text-xs text-gray-400"> FPS</span>
                    </button>
                ))}
            </div>
             <p className="text-xs text-gray-400 mt-2">Valores mais altos resultam em vídeos mais fluidos, mas arquivos maiores e exportações mais longas.</p>
        </div>
        
        <button
          onClick={handleExport}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          Exportar como MP4
        </button>
      </div>
    </Modal>
  );
};

export default ExportModal;