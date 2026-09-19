
import React, { useState } from 'react';
import { Clapperboard, Gift, Copy, Check, ArrowLeft } from 'lucide-react';

interface DonatePageProps {
  onBack: () => void;
  onGoToAbout: () => void;
}

const DonatePage: React.FC<DonatePageProps> = ({ onBack, onGoToAbout }) => {
    const pixKey = 'rcaapps2@gmail.com';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(pixKey).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        }).catch(err => {
            console.error('Falha ao copiar a chave PIX: ', err);
            alert('Falha ao copiar a chave PIX. Por favor, tente manualmente.');
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-[#1e1b4b] text-white font-sans flex flex-col">
            <header className="sticky top-0 bg-gray-900/50 backdrop-blur-md p-4 md:p-6 z-10 border-b border-gray-700/50">
                <nav className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Clapperboard className="w-8 h-8 text-violet-400" />
                        <span className="text-xl font-bold tracking-tight">VIDEO EDITOR ESPECTRO</span>
                    </div>
                     <button
                        onClick={onBack}
                        className="inline-flex items-center gap-2 bg-transparent border border-violet-500 text-violet-400 font-semibold px-4 py-2 md:px-6 rounded-lg hover:bg-violet-500 hover:text-white transition-colors text-sm md:text-base"
                    >
                        <ArrowLeft size={20} />
                        Voltar
                    </button>
                </nav>
            </header>

            <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16 flex items-center justify-center">
                <div className="w-full max-w-lg bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 md:p-8 text-center shadow-2xl shadow-violet-900/20">
                    <Gift className="w-20 h-20 mx-auto mb-6 text-violet-400" />
                    <h1 className="text-lg md:text-xl font-bold text-white mb-3">Apoie o Video Editor Espectro</h1>
                    <p className="text-gray-300 mb-8 text-xs">
                        Seu apoio é fundamental para manter o aplicativo gratuito, atualizado e com novos recursos. Considere fazer uma doação de qualquer valor.
                    </p>
                    <div className="space-y-4">
                        <p className="text-base text-gray-200">Doe via PIX para a chave:</p>
                        <div className="flex items-center justify-center bg-gray-900/70 border border-gray-600 rounded-lg p-2 md:p-3">
                            <span className="text-base font-mono text-violet-300 mr-2 md:mr-4 break-all">{pixKey}</span>
                            <button
                                onClick={handleCopy}
                                className={`p-2 rounded-md transition-colors text-white ${copied ? 'bg-green-600' : 'bg-violet-600 hover:bg-violet-700'}`}
                                title="Copiar Chave PIX"
                            >
                                {copied ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                        </div>
                    </div>
                    <p className="mt-8 text-lg font-semibold text-gray-100">Muito obrigado pelo seu apoio! ❤️</p>
                </div>
            </main>
            
            <footer className="mt-auto py-12 bg-gray-900/50 border-t border-gray-800">
                <div className="container mx-auto px-6 text-center text-gray-400 text-sm md:text-base space-y-4">
                    <p>Aplicativo desenvolvido por Rubemar Albuquerque (RCA-APPS)</p>
                    <div className="flex justify-center items-center gap-x-6 text-base md:text-lg">
                        <a href="mailto:rcaapps@videoeditorespectro" className="text-violet-400 hover:text-violet-300 transition-colors">Contato</a>
                        <button onClick={onGoToAbout} className="text-violet-400 hover:text-violet-300 transition-colors">Sobre</button>
                    </div>
                    <p>&copy; 2025 Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

export default DonatePage;