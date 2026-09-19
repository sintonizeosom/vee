import React from 'react';
import { Clapperboard, ArrowLeft } from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
  onGoToDonate: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack, onGoToDonate }) => {
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

        <main className="flex-grow container mx-auto px-4 md:px-6 py-12 md:py-16">
            <article className="max-w-4xl mx-auto text-gray-300 leading-relaxed">
                <h1 className="text-xl md:text-2xl font-bold text-violet-400 mb-6">VEE Video Editor Espectro: O Melhor Editor de Vídeo Gratuito Online para Suas Criações</h1>
                <p className="mb-6 text-sm">Cansado de editores de vídeo caros e complicados? Descubra o Video Editor Espectro, a solução definitiva para quem busca um editor de vídeo free e poderoso, diretamente no seu navegador. Com uma interface intuitiva e recursos profissionais, o Espectro é a ferramenta ideal para transformar suas ideias em vídeos incríveis, sem gastar nada.</p>
                
                <h2 className="text-lg md:text-xl font-bold text-violet-400 mb-4 mt-10">Por que o Video Editor Espectro é o Melhor Editor de Vídeo Gratuito?</h2>
                <p className="mb-6 text-sm">No mercado atual, encontrar um editor de vídeo bom e gratuito que realmente entregue resultados de qualidade é um desafio. O Video Editor Espectro se destaca por oferecer uma experiência completa, rivalizando com softwares pagos, mas com a vantagem de ser totalmente grátis e acessível de qualquer lugar. Seja você um criador de conteúdo iniciante ou um profissional experiente, nossa plataforma foi projetada para otimizar seu fluxo de trabalho e elevar a qualidade das suas produções.</p>

                <h3 className="text-base md:text-lg font-bold text-violet-400 mb-4 mt-8">Principais Recursos que o Tornam o Melhor Editor de Vídeo Gratuito:</h3>
                <ul className="list-disc list-inside space-y-4 mb-6 pl-4 text-sm">
                    <li><strong className="text-white">Edição Profissional na Nuvem:</strong> Acesse todas as ferramentas de edição diretamente do seu navegador, sem a necessidade de downloads ou instalações. Isso significa mais agilidade e liberdade para criar.</li>
                    <li><strong className="text-white">Interface Intuitiva e Amigável:</strong> Projetado para ser fácil de usar, mesmo para quem nunca editou um vídeo antes. Arraste e solte elementos, ajuste a timeline e veja suas ideias ganharem vida em poucos cliques.</li>
                    <li><strong className="text-white">Suporte a Múltiplos Formatos:</strong> Crie vídeos otimizados para as principais plataformas, como YouTube (Full HD 16:9), Instagram (1:1) e TikTok (9:16), garantindo que seu conteúdo se encaixe perfeitamente em cada rede social.</li>
                    <li><strong className="text-white">Ferramentas de Edição Avançadas:</strong> Desfrute de uma timeline completa com múltiplas trilhas, upload de vídeos, imagens e áudios, gerador de fundo com inteligência artificial, editor de texto integrado, controles de áudio precisos e muito mais. Tudo o que você precisa para uma edição de alto nível.</li>
                    <li><strong className="text-white">Empacotado com Tauri para Desktop:</strong> Disponível também como aplicativo nativo para Windows gerado via Tauri, criando um instalador .exe minúsculo de ~10MB que roda fora do Chrome tradicional, com aceleração de hardware e desempenho nativo sem consumo excessivo de memória.</li>
                    <li><strong className="text-white">Geração de Legendas Gratuitas com IA:</strong> Aumente o alcance e a acessibilidade dos seus vídeos com a transcrição e legendagem automática. Nosso editor de vídeo free faz todo o trabalho pesado.</li>
                    <li><strong className="text-white">Visualizador de Áudio Espectro:</strong> Sincronize suas edições com a batida da música usando nosso visualizador de áudio exclusivo, garantindo vídeos dinâmicos e envolventes.</li>
                    <li><strong className="text-white">Exportação de Alta Qualidade:</strong> Exporte seus projetos em alta resolução, prontos para serem compartilhados com seu público, mantendo a qualidade visual e sonora que suas criações merecem.</li>
                </ul>

                <h2 className="text-lg md:text-xl font-bold text-violet-400 mb-4 mt-10">Quem Pode se Beneficiar do Video Editor Espectro?</h2>
                <p className="mb-6 text-sm">Se você está procurando um editor de vídeo gratuito para:</p>
                <ul className="list-disc list-inside space-y-4 mb-6 pl-4 text-sm">
                    <li><strong className="text-white">Criadores de Conteúdo:</strong> Produza vídeos para YouTube, Instagram, TikTok e outras plataformas com agilidade e qualidade profissional.</li>
                    <li><strong className="text-white">Estudantes e Educadores:</strong> Crie apresentações dinâmicas, tutoriais e materiais didáticos interativos.</li>
                    <li><strong className="text-white">Pequenas Empresas e Empreendedores:</strong> Desenvolva vídeos promocionais, anúncios e conteúdo para redes sociais que impulsionem seu negócio.</li>
                </ul>
            </article>
        </main>
        
        <footer className="mt-auto py-12 bg-gray-900/50 border-t border-gray-800">
            <div className="container mx-auto px-6 text-center text-gray-400 text-sm md:text-base space-y-4">
                <p>Aplicativo desenvolvido por Rubemar Albuquerque (RCA-APPS)</p>
                <div className="flex justify-center items-center gap-x-6 text-base md:text-lg">
                    <a href="mailto:rcaapps@videoeditorespectro" className="text-violet-400 hover:text-violet-300 transition-colors">Contato</a>
                    <button onClick={onGoToDonate} className="text-violet-400 hover:text-violet-300 transition-colors">Apoiar</button>
                </div>
                <p>&copy; 2025 Todos os direitos reservados.</p>
            </div>
        </footer>
    </div>
  );
};

export default AboutPage;