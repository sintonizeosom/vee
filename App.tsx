
import React, { useState, useEffect } from 'react';
import { ProjectFormat } from './types';
import FormatSelector from './components/FormatSelector';
// FIX: Changed to a named import for Editor, as it is now exported as a named component.
import { Editor } from './components/Editor';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import DonatePage from './components/DonatePage';
import { WindowsAppModal } from './components/WindowsAppModal';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'app' | 'about' | 'donate'>('landing');
  const [previousView, setPreviousView] = useState<'landing' | 'app'>('landing');
  const [format, setFormat] = useState<ProjectFormat | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isWindowsModalOpen, setIsWindowsModalOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Helper function to update meta tags for SEO in a SPA
  const updateMeta = (name: string, content: string) => {
    let element = document.querySelector(`meta[name='${name}']`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('name', name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  useEffect(() => {
    switch (view) {
      case 'about':
        document.title = 'Sobre | VEE - Editor de Vídeo Gratuito com Legendas Grátis';
        updateMeta('description', 'Saiba mais sobre o VEE, o editor de vídeo free que oferece geração de legendas gratuitas com IA, espectro de áudio e uma timeline multipista profissional.');
        break;
      case 'donate':
        document.title = 'Apoiar | VEE - Video Editor Espectro';
        updateMeta('description', 'Apoie o desenvolvimento do VEE - Video Editor Espectro. Sua doação via PIX nos ajuda a manter a ferramenta gratuita e sempre melhorando.');
        break;
      case 'app':
        document.title = format ? 'Editor | VEE - Video Editor Espectro (Windows)' : 'Seleção de Formato | VEE';
        updateMeta('description', 'Editor de vídeo online completo otimizado para Windows. Adicione espectros de áudio, texto, logos e edite na timeline multipista do VEE para criar vídeos incríveis.');
        break;
      case 'landing':
      default:
        document.title = 'VEE - Editor de Vídeo Gratuito (Windows Desktop & Web)';
        updateMeta('description', 'O VEE é o melhor editor de vídeo free para Windows e Web. Faça geração de legendas gratuitas com IA, crie espectros de áudio e use nosso banco de mídias.');
        break;
    }
  }, [view, format]);

  const handleStartApp = () => {
    setView('app');
  };

  const handleGoToAbout = () => {
    if (view !== 'about' && view !== 'donate') {
      setPreviousView(view as 'landing' | 'app');
    }
    setView('about');
  };

  const handleGoToDonate = () => {
    if (view !== 'about' && view !== 'donate') {
      setPreviousView(view as 'landing' | 'app');
    }
    setView('donate');
  };

  const handleBackFromSubPage = () => {
    setView(previousView);
  };

  const handleGoToLanding = () => {
    setView('landing');
    setFormat(null); // Reset format when going back to landing
  };

  const handleFormatSelect = (selectedFormat: ProjectFormat) => {
    setFormat(selectedFormat);
  };

  const handleBackFromEditor = () => {
    setFormat(null);
  };

  return (
    <>
      <WindowsAppModal
        isOpen={isWindowsModalOpen}
        onClose={() => setIsWindowsModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
      />

      {view === 'about' && <AboutPage onBack={handleBackFromSubPage} onGoToDonate={handleGoToDonate} />}

      {view === 'donate' && <DonatePage onBack={handleBackFromSubPage} onGoToAbout={handleGoToAbout} />}

      {view === 'landing' && (
        <LandingPage
          onStart={handleStartApp}
          onGoToAbout={handleGoToAbout}
          onGoToDonate={handleGoToDonate}
          onOpenWindowsModal={() => setIsWindowsModalOpen(true)}
        />
      )}

      {view === 'app' && (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-[#1e1b4b] text-white font-sans">
          {format ? (
            <Editor
              format={format}
              onBack={handleBackFromEditor}
              onGoToAbout={handleGoToAbout}
              onGoToDonate={handleGoToDonate}
              onOpenWindowsModal={() => setIsWindowsModalOpen(true)}
              deferredPrompt={deferredPrompt}
            />
          ) : (
            <FormatSelector onSelectFormat={handleFormatSelect} onBack={handleGoToLanding} />
          )}
        </div>
      )}
    </>
  );
};

export default App;
