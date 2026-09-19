
import React from 'react';
import { ProjectFormat } from '../types';
import { FORMAT_DIMENSIONS } from '../constants';
import { Clapperboard, ArrowLeft } from 'lucide-react';


interface FormatSelectorProps {
  onSelectFormat: (format: ProjectFormat) => void;
  onBack: () => void;
}

const FormatSelector: React.FC<FormatSelectorProps> = ({ onSelectFormat, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
      <button 
        onClick={onBack} 
        className="absolute top-6 left-6 p-3 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors z-10"
        aria-label="Voltar à página inicial"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="text-center mb-8">
        <Clapperboard className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 text-violet-400" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">VIDEO EDITOR ESPECTRO</h1>
        <p className="text-sm md:text-base text-gray-300 mt-2">Escolha um formato para começar sua obra-prima.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 w-full max-w-4xl">
        {(Object.keys(FORMAT_DIMENSIONS) as ProjectFormat[]).map((format) => (
          <button
            key={format}
            onClick={() => onSelectFormat(format)}
            className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 text-center sm:text-left hover:bg-violet-600/50 hover:border-violet-500 transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex flex-col sm:flex-row items-center">
              <div className="text-violet-400 group-hover:text-white transition-colors duration-300 mb-4 sm:mb-0 sm:mr-4 flex-shrink-0">
                {FORMAT_DIMENSIONS[format].icon}
              </div>
              <div>
                <h2 className="text-base md:text-lg font-semibold">{FORMAT_DIMENSIONS[format].name}</h2>
                <p className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors duration-300">{`${FORMAT_DIMENSIONS[format].width} x ${FORMAT_DIMENSIONS[format].height}px`}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
       <p className="mt-10 text-gray-500 text-sm">Crie visualizadores de áudio incríveis para suas músicas.</p>
    </div>
  );
};

export default FormatSelector;