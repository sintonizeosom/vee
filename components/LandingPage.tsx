import React from 'react';
import { Clapperboard, Music, ImagePlay, Type, FileDown, Upload, Sparkles, Download, ArrowRight, Monitor, Laptop } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onGoToAbout: () => void;
  onGoToDonate: () => void;
  onOpenWindowsModal?: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 text-center transform hover:-translate-y-2 transition-transform duration-300">
        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-violet-900/50 flex items-center justify-center border-2 border-violet-500/50 text-violet-300">
            {icon}
        </div>
        <h3 className="text-base font-bold mb-2 text-white">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
    </div>
);

const StepCard: React.FC<{ icon: React.ReactNode; step: string; description: string }> = ({ icon, step, description }) => (
    <div className="flex flex-col items-center text-center">
        <div className="mb-3 w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-violet-400 text-3xl font-bold border-2 border-dashed border-gray-600">
            {icon}
        </div>
        <h4 className="text-sm font-semibold text-white">{step}</h4>
        <p className="text-gray-400 max-w-xs text-sm">{description}</p>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onGoToAbout, onGoToDonate, onOpenWindowsModal }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-[#1e1b4b] text-white font-sans overflow-x-hidden">
        <header className="absolute top-0 left-0 right-0 p-4 md:p-6 z-10">
            <nav className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Clapperboard className="w-8 h-8 text-violet-400" />
                    <span className="text-xl font-bold tracking-tight">VIDEO EDITOR ESPECTRO</span>
                </div>
                <div className="flex items-center gap-3">
                  {onOpenWindowsModal && (
                    <button
                      onClick={onOpenWindowsModal}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm shadow-md"
                    >
                      <Monitor className="w-4 h-4" />
                      App Windows (Tauri ~10MB)
                    </button>
                  )}
                  <button 
                      onClick={onStart} 
                      className="hidden md:inline-flex items-center gap-2 bg-transparent border border-violet-500 text-violet-400 font-semibold px-6 py-2 rounded-lg hover:bg-violet-500 hover:text-white transition-colors"
                  >
                      Abrir Editor
                  </button>
                </div>
            </nav>
        </header>

        <main>
            {/* Hero Section */}
            <section className="relative container mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-20 md:pb-24 text-center flex flex-col items-center">
                 <div className="absolute -top-20 -left-40 w-96 h-96 bg-violet-900/50 rounded-full blur-3xl filter opacity-30 animate-pulse"></div>
                 <div className="absolute -bottom-20 -right-40 w-96 h-96 bg-cyan-900/50 rounded-full blur-3xl filter opacity-30 animate-pulse animation-delay-4000"></div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-900/60 border border-violet-500/40 text-violet-200 text-xs font-semibold mb-4 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-0.5"></span>
                  <Monitor className="w-3.5 h-3.5 text-cyan-300" />
                  Empacotado com Tauri • Instalador .EXE ~10MB • Fora do Chrome com Desempenho Nativo
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">
                    Crie e Edite Vídeos Espetaculares no Windows & Web
                </h1>
                <p className="text-base text-gray-300 max-w-3xl mx-auto mb-8">
                    Dê vida às suas músicas com nosso editor de vídeo free. Empacotado com Tauri para gerar um instalador .exe minúsculo de ~10MB, rodando fora do Chrome tradicional com desempenho nativo de desktop. Faça geração de legendas gratuitas com IA, crie espectros de áudio e exporte em MP4.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button 
                      onClick={onStart}
                      className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-white bg-violet-600 rounded-full overflow-hidden transition-all duration-300 hover:bg-violet-700 shadow-lg shadow-violet-900/50"
                  >
                      <span className="relative">Comece a Criar Gratuitamente</span>
                      <ArrowRight className="ml-2 transform group-hover:translate-x-1 transition-transform" />
                  </button>

                  {onOpenWindowsModal && (
                    <button
                      onClick={onOpenWindowsModal}
                      className="inline-flex items-center justify-center px-6 py-3 text-base font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/50 rounded-full hover:bg-cyan-900/80 transition-all shadow-md gap-2"
                    >
                      <Laptop className="w-5 h-5 text-cyan-400" />
                      Instalar no Windows (.EXE / PWA)
                    </button>
                  )}
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-16 md:py-20 bg-gray-900/30">
                <div className="container mx-auto px-4 md:px-6">
                    <h2 className="text-xl md:text-2xl font-bold text-center mb-10 md:mb-12">Recursos Poderosos</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FeatureCard 
                            icon={<Music size={28} />} 
                            title="Visualizadores de Áudio"
                            description="Dezenas de estilos de espectro de áudio que reagem dinamicamente à sua música."
                        />
                         <FeatureCard 
                            icon={<ImagePlay size={28} />} 
                            title="Banco de Mídia Gratuito"
                            description="Acesse milhares de fotos e vídeos de alta qualidade para usar como fundo ou clipes."
                        />
                         <FeatureCard 
                            icon={<Type size={28} />} 
                            title="Texto, Legendas e Logos"
                            description="Adicione seu logo, textos com estilos e faça a geração de legendas gratuitas com IA para mais acessibilidade."
                        />
                         <FeatureCard 
                            icon={<FileDown size={28} />} 
                            title="Exportação Fácil"
                            description="Exporte seu vídeo final em alta qualidade, otimizado para YouTube, Instagram e TikTok."
                        />
                    </div>
                </div>
            </section>

             {/* How it works Section */}
            <section className="py-16 md:py-20">
                <div className="container mx-auto px-4 md:px-6">
                    <h2 className="text-xl md:text-2xl font-bold text-center mb-12 md:mb-16">Como Funciona? Simples Assim.</h2>
                    <div className="relative grid md:grid-cols-3 gap-12 md:gap-16 items-start">
                        <div className="absolute top-8 left-0 right-0 h-1 hidden md:block">
                           <svg width="100%" height="100%">
                                <line x1="0" y1="50%" x2="100%" y2="50%" strokeDasharray="10, 10" stroke="#4a5568" strokeWidth="2"/>
                           </svg>
                        </div>
                         <StepCard 
                            icon={<Upload size={28} />}
                            step="1. Carregue"
                            description="Faça o upload da sua música, logo e qualquer imagem ou vídeo que queira usar."
                        />
                         <StepCard 
                            icon={<Sparkles size={28} />}
                            step="2. Personalize"
                            description="Escolha um formato, adicione um espectro, insira textos e aplique efeitos visuais."
                        />
                        <StepCard 
                            icon={<Download size={28} />}
                            step="3. Exporte"
                            description="Exporte seu vídeo finalizado em MP4 com a qualidade que você precisa."
                        />
                    </div>
                </div>
            </section>
        </main>
        
        <footer className="py-10 bg-gray-900/50 border-t border-gray-800">
            <div className="container mx-auto px-4 md:px-6 text-center text-gray-400 text-sm md:text-base space-y-4">
                <p>Aplicativo desenvolvido por Rubemar Albuquerque (RCA-APPS)</p>
                <div className="flex justify-center items-center gap-x-6 text-base md:text-lg">
                    <a href="mailto:rcaapps@videoeditorespectro" className="text-violet-400 hover:text-violet-300 transition-colors">Contato</a>
                    <button onClick={onGoToAbout} className="text-violet-400 hover:text-violet-300 transition-colors">Sobre</button>
                    <button onClick={onGoToDonate} className="text-violet-400 hover:text-violet-300 transition-colors">Apoiar</button>
                </div>
                <p>&copy; 2025 Todos os direitos reservados.</p>
            </div>
        </footer>
    </div>
  );
};

export default LandingPage;