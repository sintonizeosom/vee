import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Sparkles, Smile, Copy, Check, Zap, Eye, Clock, Flame, Heart, Music, Layers, Utensils, Trophy, Compass, Dog, Lightbulb, Flag } from 'lucide-react';
import { EMOJI_CATEGORIES, EMOJIS_LIBRARY, EmojiItem, getRecentEmojis, addRecentEmoji } from '../data/emojis';

interface EmojiAddOptions {
  emoji: string;
  fontSize?: number;
  animationIn?: string;
  animationLoop?: string;
}

interface EmojiLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmoji: (options: EmojiAddOptions) => void;
}

export const EmojiLibraryModal: React.FC<EmojiLibraryModalProps> = ({
  isOpen,
  onClose,
  onAddEmoji,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState<number>(150);
  const [selectedAnimIn, setSelectedAnimIn] = useState<string>('pop-in-by-word');
  const [selectedAnimLoop, setSelectedAnimLoop] = useState<string>('none');
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRecentEmojis(getRecentEmojis());
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const filteredEmojis = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (query) {
      return EMOJIS_LIBRARY.filter(
        (item) =>
          item.emoji.includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (selectedCategory === 'recent') {
      return recentEmojis.map((eStr) => {
        const found = EMOJIS_LIBRARY.find((item) => item.emoji === eStr);
        return (
          found || {
            emoji: eStr,
            name: 'Emoji Recente',
            category: 'recent',
            tags: ['recente'],
          }
        );
      });
    }

    return EMOJIS_LIBRARY.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, searchQuery, recentEmojis]);

  if (!isOpen) return null;

  const handleSelectEmoji = (emojiStr: string, name?: string) => {
    addRecentEmoji(emojiStr);
    setRecentEmojis(getRecentEmojis());

    onAddEmoji({
      emoji: emojiStr,
      fontSize: selectedSize,
      animationIn: selectedAnimIn,
      animationLoop: selectedAnimLoop,
    });

    showToast(`Emoji ${emojiStr} adicionado à timeline!`);
  };

  const handleCopyClipboard = (e: React.MouseEvent, emojiStr: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(emojiStr);
    setCopiedEmoji(emojiStr);
    showToast(`Emoji ${emojiStr} copiado!`);
    setTimeout(() => setCopiedEmoji(null), 1500);
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'recent': return <Clock size={16} className="text-amber-400" />;
      case 'popular': return <Flame size={16} className="text-orange-400" />;
      case 'faces': return <Smile size={16} className="text-yellow-400" />;
      case 'gestures': return <Zap size={16} className="text-emerald-400" />;
      case 'hearts': return <Heart size={16} className="text-rose-400" />;
      case 'music': return <Music size={16} className="text-violet-400" />;
      case 'effects': return <Sparkles size={16} className="text-cyan-400" />;
      case 'food': return <Utensils size={16} className="text-orange-300" />;
      case 'sports': return <Trophy size={16} className="text-yellow-300" />;
      case 'travel': return <Compass size={16} className="text-sky-400" />;
      case 'animals': return <Dog size={16} className="text-amber-300" />;
      case 'objects': return <Lightbulb size={16} className="text-yellow-200" />;
      case 'flags': return <Flag size={16} className="text-green-400" />;
      default: return <Smile size={16} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-5">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-violet-950/50 overflow-hidden text-white font-sans">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between bg-gray-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-inner">
              <Smile size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Biblioteca de Emojis</h2>
                <span className="text-[10px] bg-violet-500/20 border border-violet-500/40 text-violet-300 px-2 py-0.5 rounded-full font-semibold">
                  {EMOJIS_LIBRARY.length}+ Emojis HD
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Escolha emojis animados para enriquecer seus vídeos e shorts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Customization Bar */}
        <div className="p-4 bg-gray-950/60 border-b border-gray-800 space-y-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-grow">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar emoji por nome, tag ou palavra-chave (ex: fogo, amor, rir, star)..."
                className="w-full bg-gray-800/90 border border-gray-700/80 rounded-xl pl-10 pr-9 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 transition-colors"
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

            {/* Size Selector */}
            <div className="flex items-center gap-2 bg-gray-800/80 border border-gray-700/80 rounded-xl px-3 py-1.5 flex-shrink-0">
              <span className="text-xs text-gray-300 font-medium whitespace-nowrap">Tamanho:</span>
              <div className="flex gap-1">
                {[
                  { label: 'P', size: 100 },
                  { label: 'M', size: 150 },
                  { label: 'G', size: 220 },
                  { label: 'XL', size: 300 },
                ].map((s) => (
                  <button
                    key={s.size}
                    onClick={() => setSelectedSize(s.size)}
                    className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${
                      selectedSize === s.size
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Animation Preset Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg border border-gray-800">
              <Sparkles size={14} className="text-violet-400 flex-shrink-0" />
              <span className="text-gray-300 font-medium flex-shrink-0">Entrada:</span>
              <select
                value={selectedAnimIn}
                onChange={(e) => setSelectedAnimIn(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 w-full"
              >
                <option value="none">Sem animação</option>
                <option value="pop-in-by-word">Pop In (Efeito Quique)</option>
                <option value="spin-bounce-in">Giro & Quique 3D</option>
                <option value="swing-in">Balanço 3D (Swing)</option>
                <option value="drop-impact-in">Impacto de Queda</option>
                <option value="zoom-in">Zoom In</option>
                <option value="bounce-in-by-word">Quicar</option>
                <option value="rotate-in">Girar Entrada</option>
                <option value="glitch-reveal-in">Glitch Revelação</option>
                <option value="smoke-dissolve-in">Dissolver Fumaça</option>
                <option value="fade">Esmaecer (Fade)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg border border-gray-800">
              <Zap size={14} className="text-amber-400 flex-shrink-0" />
              <span className="text-gray-300 font-medium flex-shrink-0">Efeito Loop:</span>
              <select
                value={selectedAnimLoop}
                onChange={(e) => setSelectedAnimLoop(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500 w-full"
              >
                <option value="none">Nenhum</option>
                <option value="float-rotate-3d">Flutuar 3D</option>
                <option value="pulse-glow">Pulso Neon</option>
                <option value="heartbeat">Batimento (Heartbeat)</option>
                <option value="wobble">Wobble (Balanço)</option>
                <option value="breath">Respiração Suave</option>
                <option value="float">Flutuar Leve</option>
                <option value="bounce">Quicar Contínuo</option>
                <option value="jitter">Vibrar (Jitter)</option>
                <option value="rainbow">Arco-Íris</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categories Tabs */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 p-2 px-4 bg-gray-900 border-b border-gray-800 overflow-x-auto scrollbar-none flex-shrink-0">
            {EMOJI_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-950/60'
                      : 'bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-white'
                  }`}
                >
                  <span>{getCategoryIcon(cat.id)}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Emoji Grid & Details View */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-950/40">
          {searchQuery && (
            <div className="mb-3 text-xs text-gray-400 flex items-center justify-between">
              <span>Resultados para "{searchQuery}":</span>
              <span className="text-violet-400 font-semibold">{filteredEmojis.length} emojis encontrados</span>
            </div>
          )}

          {filteredEmojis.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-3">
              <Smile size={48} className="mx-auto text-gray-600 animate-bounce" />
              <p className="text-base font-semibold text-gray-300">Nenhum emoji encontrado</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Tente buscar por termos mais genéricos como "fogo", "amor", "festa" ou limpe a busca.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors mt-2"
              >
                Limpar Busca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {filteredEmojis.map((item, idx) => (
                <div
                  key={`${item.emoji}-${idx}`}
                  onMouseEnter={() => setHoveredEmoji(item)}
                  onMouseLeave={() => setHoveredEmoji(null)}
                  onClick={() => handleSelectEmoji(item.emoji, item.name)}
                  className="group relative aspect-square bg-gray-800/60 hover:bg-violet-900/40 border border-gray-700/50 hover:border-violet-500/80 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:z-20 active:scale-95 shadow-sm hover:shadow-lg hover:shadow-violet-950/50"
                  title={`${item.name} (Clique para adicionar à timeline)`}
                >
                  <span className="text-2xl sm:text-3xl select-none transition-transform group-hover:scale-125">
                    {item.emoji}
                  </span>

                  {/* Copy Button on Hover */}
                  <button
                    onClick={(e) => handleCopyClipboard(e, item.emoji)}
                    className="absolute top-1 right-1 p-1 bg-gray-900/90 text-gray-300 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                    title="Copiar emoji"
                  >
                    {copiedEmoji === item.emoji ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info & Hover Tooltip */}
        <div className="p-3 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-2">
            {hoveredEmoji ? (
              <div className="flex items-center gap-2 animate-fadeIn">
                <span className="text-xl">{hoveredEmoji.emoji}</span>
                <span className="font-semibold text-violet-300">{hoveredEmoji.name}</span>
                <span className="hidden sm:inline text-[11px] text-gray-500">
                  ({hoveredEmoji.tags.slice(0, 3).join(', ')})
                </span>
              </div>
            ) : (
              <span className="text-gray-400 italic">Passe o mouse para detalhes, clique para inserir na posição do vídeo.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-[11px] hidden sm:inline">
              Dica: Emojis adicionados recebem formatação em alta definição
            </span>
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg shadow-violet-950/80 border border-violet-400 flex items-center gap-2 animate-bounce z-50">
            <Check size={14} className="text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
};
