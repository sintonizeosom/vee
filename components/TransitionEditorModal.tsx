import React, { useState } from 'react';
import Modal from './Modal';
import { TimelineTransition, TransitionType } from '../types';
import { TRANSITION_MODELS } from '../constants';
import { X, Trash2, Star, Layers } from 'lucide-react';

interface TransitionEditorModalProps {
  transition: TimelineTransition | null;
  onClose: () => void;
  onUpdate: (data: { type: TransitionType; duration: number }) => void;
  onDelete: () => void;
  onSetDefault: (data: { type: TransitionType; duration: number }) => void;
  onApplyToAll: (data: { type: TransitionType; duration: number }) => void;
}

const TransitionEditorModal: React.FC<TransitionEditorModalProps> = ({ transition, onClose, onUpdate, onDelete, onSetDefault, onApplyToAll }) => {
  const [selectedType, setSelectedType] = useState<TransitionType>(transition?.type || 'fade');
  const [duration, setDuration] = useState<number>(transition?.duration || 1.0);
  const [defaultSet, setDefaultSet] = useState(false);
  const [appliedToAll, setAppliedToAll] = useState(false);

  const handleSave = () => {
    onUpdate({ type: selectedType, duration });
  };

  const handleRemove = () => {
    onDelete();
  };

  const handleSetDefault = () => {
    onSetDefault({ type: selectedType, duration });
    setDefaultSet(true);
    setTimeout(() => setDefaultSet(false), 2000);
  };

  const handleApplyToAll = () => {
    onApplyToAll({ type: selectedType, duration });
    setAppliedToAll(true);
    setTimeout(() => setAppliedToAll(false), 2000);
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-violet-400">Editar Transição</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><X size={20}/></button>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Estilo da Transição</label>
          <div className="grid grid-cols-auto-fit-80 gap-2 mb-6">
              {TRANSITION_MODELS.map(model => (
                  <button 
                      key={model.id}
                      onClick={() => setSelectedType(model.id)}
                      title={model.name}
                      className={`aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded-lg transition-all border-2 ${selectedType === model.id ? 'bg-violet-700/80 border-violet-400' : 'bg-gray-700/50 border-transparent hover:border-violet-500'}`}
                  >
                       {React.cloneElement(model.icon as React.ReactElement<{ className?: string }>, { className: `w-6 h-6 ${selectedType === model.id ? 'text-white' : 'text-gray-300'}` })}
                       <span className={`text-xs text-center leading-tight ${selectedType === model.id ? 'text-white' : 'text-gray-400'}`}>{model.name}</span>
                  </button>
              ))}
          </div>
        </div>

        <div>
          <label htmlFor="transition-duration" className="block text-sm font-medium text-gray-300 mb-2">Duração (segundos)</label>
          <div className="flex items-center gap-4">
              <input
                  id="transition-duration"
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="font-mono text-lg">{duration.toFixed(1)}s</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-between">
            <div className="flex flex-wrap gap-2">
                <button onClick={handleRemove} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-md hover:bg-red-600/40 transition-colors text-sm">
                    <Trash2 size={16} /> Remover
                </button>
                <button onClick={handleSetDefault} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm ${defaultSet ? 'bg-green-500 text-white' : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600'}`}>
                    <Star size={16} /> {defaultSet ? 'Salvo como Padrão!' : 'Definir como Padrão'}
                </button>
                <button onClick={handleApplyToAll} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm ${appliedToAll ? 'bg-green-500 text-white' : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600'}`}>
                    <Layers size={16} /> {appliedToAll ? 'Aplicado a todos!' : 'Aplicar a Todos'}
                </button>
            </div>
            <button onClick={handleSave} className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-md transition-colors text-sm">
                Salvar
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default TransitionEditorModal;