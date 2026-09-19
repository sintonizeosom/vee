import React, { useState, useMemo } from 'react';
import { X, Search, Sparkles, Plus, Upload, Link, Check, Zap, Eye } from 'lucide-react';
import { STICKERS_LIBRARY, STICKER_CATEGORIES, StickerItem } from '../data/stickers';

interface StickerLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSticker: (sticker: StickerItem, animation?: string) => void;
}

export const StickerLibraryModal: React.FC<StickerLibraryModalProps> = ({
  isOpen,
  onClose,
  onAddSticker,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAnimation, setSelectedAnimation] = useState<string>('zoom-bounce');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library');
  const [addedToast, setAddedToast] = useState<string | null>(null);

  const filteredStickers = useMemo(() => {
    return STICKERS_LIBRARY.filter((sticker) => {
      const matchesCategory =
        selectedCategory === 'all' || sticker.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        sticker.name.toLowerCase().includes(query) ||
        sticker.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleSelectSticker = (sticker: StickerItem) => {
    onAddSticker(sticker, selectedAnimation);
    setAddedToast(`Sticker "${sticker.name}" adicionado!`);
    setTimeout(() => {
      setAddedToast(null);
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        const customSticker: StickerItem = {
          id: `custom-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: 'social',
          categoryLabel: 'Custom',
          tags: ['custom', 'upload'],
          src,
          width: 250,
          height: 250,
          defaultAnimation: 'zoom-in',
        };
        onAddSticker(customSticker, selectedAnimation);
        setAddedToast(`Sticker customizado adicionado!`);
        setTimeout(() => setAddedToast(null), 2000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    const customSticker: StickerItem = {
      id: `url-${Date.now()}`,
      name: customName.trim() || 'Sticker Web',
      category: 'social',
      categoryLabel: 'Custom',
      tags: ['custom', 'url'],
      src: customUrl.trim(),
      width: 250,
      height: 250,
      defaultAnimation: 'zoom-in',
    };
    onAddSticker(customSticker, selectedAnimation);
    setCustomUrl('');
    setCustomName('');
    setAddedToast(`Sticker da web adicionado!`);
    setTimeout(() => setAddedToast(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gray-800/90 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-600/20 text-violet-400 rounded-xl border border-violet-500/30">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Biblioteca de Stickers & Elementos
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-600 text-white">
                  HD
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Adicione botões do YouTube, elementos para redes sociais, selos, emojis 3D e adesivos ao seu vídeo.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
            title="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation Tabs (Biblioteca vs Enviar) */}
        <div className="px-5 pt-3 bg-gray-800/40 border-b border-gray-800 flex items-center justify-between flex-shrink-0 gap-4 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'library'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Sparkles size={16} /> Coleção Completa
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'custom'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Upload size={16} /> Upload de Sticker / URL
            </button>
          </div>

          {/* Preset Animation Selection */}
          <div className="flex items-center gap-2 text-xs text-gray-300 bg-gray-800/80 px-3 py-1.5 rounded-xl border border-gray-700">
            <Zap size={14} className="text-amber-400" />
            <span className="font-semibold">Efeito de Entrada:</span>
            <select
              value={selectedAnimation}
              onChange={(e) => setSelectedAnimation(e.target.value)}
              className="bg-gray-900 text-violet-300 font-semibold rounded-md border border-gray-600 px-2 py-1 text-xs focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="zoom-bounce">Zoom Elástico (Bounce)</option>
              <option value="zoom-in">Zoom In Suave</option>
              <option value="pulse-beat-bass">Grave / Pulsar Beat</option>
              <option value="float-rotate-3d">Flutuação 3D</option>
              <option value="ken-burns">Ken Burns Mídia</option>
              <option value="whip-zoom-in">Whip Zoom Impacto</option>
              <option value="retro-vhs-jitter">Retro VHS Jitter</option>
              <option value="none">Sem Animação</option>
            </select>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'library' ? (
          <div className="flex-grow flex flex-col overflow-hidden p-5 space-y-4">
            
            {/* Search and Category Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar stickers por nome, tag (ex: youtube, like, vinil, fogo)..."
                  className="w-full bg-gray-800/90 border border-gray-700 text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700 flex-shrink-0">
              {STICKER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    selectedCategory === cat.id
                      ? 'bg-violet-600/30 text-violet-300 border-violet-500/60 shadow-sm'
                      : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Stickers Grid */}
            <div className="flex-grow overflow-y-auto pr-1">
              {filteredStickers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                  <Sparkles size={40} className="text-gray-600 mb-3" />
                  <p className="text-base font-semibold">Nenhum sticker encontrado</p>
                  <p className="text-xs text-gray-500 mt-1">Tente buscar por outros termos ou mudar a categoria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredStickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      onClick={() => handleSelectSticker(sticker)}
                      className="group relative bg-gray-800/60 border border-gray-700/70 hover:border-violet-500/80 rounded-xl p-3 flex flex-col items-center justify-between cursor-pointer hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] shadow-md hover:shadow-violet-900/20"
                    >
                      {/* Checkered preview background */}
                      <div className="w-full aspect-square bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:12px_12px] bg-gray-950/60 rounded-lg p-2 flex items-center justify-center relative overflow-hidden mb-2">
                        <img
                          src={sticker.src}
                          alt={sticker.name}
                          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-violet-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1">
                            <Plus size={14} /> Adicionar
                          </span>
                        </div>
                      </div>

                      <div className="w-full text-center">
                        <p className="text-xs font-bold text-gray-200 truncate group-hover:text-violet-300">
                          {sticker.name}
                        </p>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mt-0.5">
                          {sticker.categoryLabel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Custom Upload Tab */
          <div className="flex-grow p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File Upload Box */}
              <div className="bg-gray-800/60 border-2 border-dashed border-gray-700 hover:border-violet-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all group">
                <div className="p-4 bg-violet-600/10 text-violet-400 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Upload do Seu Computador</h3>
                <p className="text-xs text-gray-400 mb-4 max-w-xs">
                  Envie imagens transparentes PNG, SVG, WebP ou GIF do seu dispositivo.
                </p>
                <label className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl cursor-pointer shadow-lg transition-all flex items-center gap-2">
                  <Upload size={16} /> Selecionar Arquivo
                  <input
                    type="file"
                    accept="image/png, image/svg+xml, image/webp, image/gif, image/jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Paste URL Box */}
              <form
                onSubmit={handleAddCustomUrl}
                className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-violet-400 mb-3 font-bold text-sm">
                    <Link size={18} /> Adicionar por Link de Imagem (URL)
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        URL da Imagem / Sticker
                      </label>
                      <input
                        type="url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://exemplo.com/meu-sticker.png"
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3.5 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder-gray-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Nome do Sticker (Opcional)
                      </label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Ex: Minha Logo Transparente"
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3.5 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder-gray-600"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!customUrl.trim()}
                  className="mt-6 w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Inserir Sticker
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Footer & Toast Bar */}
        <div className="p-4 bg-gray-800/90 border-t border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <Eye size={14} className="text-violet-400" />
            O sticker será inserido na linha do tempo na posição atual da agulha de reprodução.
          </div>

          <div className="flex items-center gap-3">
            {addedToast && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fade-in">
                <Check size={14} /> {addedToast}
              </span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
