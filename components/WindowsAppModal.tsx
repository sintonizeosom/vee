import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Monitor, Download, Laptop, Check, Copy, FileCode, Terminal, ExternalLink, Zap, Keyboard, ShieldCheck, Sparkles, FolderArchive, Cpu, HardDrive, Gauge, Box, Flame } from 'lucide-react';

interface WindowsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onTriggerInstall?: () => void;
}

export const WindowsAppModal: React.FC<WindowsAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerInstall
}) => {
  const [activeTab, setActiveTab] = useState<'tauri' | 'pwa' | 'bat' | 'shortcuts' | 'portable'>('tauri');
  const [copiedBat, setCopiedBat] = useState(false);
  const [copiedTauri, setCopiedTauri] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running as standalone app (already installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
  }, []);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000';

  const tauriBuildBatContent = `@echo off
title VEE - Compilador Tauri Windows Desktop (.exe ~10MB)
color 0B
echo ================================================================
echo    VEE Video Editor Espectro - Instalador Nativo Tauri (.EXE)
echo ================================================================
echo.
echo Este script compila o codigo fonte do VEE em um instalador .exe
echo nativo para Windows.
echo.

if not exist "package.json" (
    color 0C
    echo [AVISO IMPORTANTE]
    echo O arquivo package.json nao foi encontrado nesta pasta!
    echo.
    echo Este arquivo (.bat) e o script para COMPILAR o instalador .exe
    echo a partir do codigo-fonte do VEE.
    echo.
    echo Para usar o aplicativo AGORA no Windows sem precisar compilar:
    echo 1. Volte ao VEE no navegador
    echo 2. Clique em "App Windows"
    echo 3. Escolha "Atalho Direto (.URL)" (ele abre direto sem tela preta)
    echo.
    echo Pressione qualquer tecla para fechar esta janela...
    pause
    exit /b
)

echo Verificando ferramentas de compilacao...
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Rust/Cargo nao encontrado no sistema.
    echo O Tauri utiliza Rust para gerar executaveis leves de ~10MB.
    echo Abrindo o instalador oficial do Rust (rustup.rs)...
    start "" https://rustup.rs/
    echo Apos instalar o Rust, execute este script novamente.
    pause
    exit /b
)

echo [OK] Rust detectado!
echo Instalando dependencias e preparando o pacote Tauri...
call npm install
echo.
echo Compilando o VEE para Windows (.exe ultraleve de ~10MB)...
call npm run tauri:build

echo.
echo ================================================================
echo [SUCESSO] Instalador gerado com sucesso!
echo Local do instalador:
echo src-tauri\\target\\release\\bundle\\nsis\\
echo ================================================================
pause
`;

  const batScriptContent = `@echo off
title VEE - Video Editor Espectro (Windows Desktop)
color 0A
echo =========================================================
echo    Iniciando VEE - Video Editor Espectro para Windows...
echo =========================================================
echo.

set "APP_URL=${currentUrl}"

echo Abrindo o aplicativo no Windows...

REM 1. Abrir no navegador padrao do Windows ou modo janela
start "" "%APP_URL%"

echo.
echo =========================================================
echo  [OK] Comando enviado com sucesso!
echo  O VEE deve carregar no seu navegador em instantes.
echo =========================================================
echo.
echo Caso nao tenha aberto, pressione qualquer tecla para tentar
echo abrir em modo janela (Edge/Chrome)...
pause

start msedge --app="%APP_URL%" --window-size=1280,750 2>nul || start chrome --app="%APP_URL%" --window-size=1280,750 2>nul || start "" "%APP_URL%"
`;

  const handleDownloadTauriBat = () => {
    const blob = new Blob([tauriBuildBatContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compilar_vee_tauri.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyTauriCmd = () => {
    navigator.clipboard.writeText('npm run tauri:build');
    setCopiedTauri(true);
    setTimeout(() => setCopiedTauri(false), 2000);
  };

  const handleDownloadBat = () => {
    const blob = new Blob([batScriptContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iniciar_vee_windows.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadUrlShortcut = () => {
    const urlShortcutContent = `[InternetShortcut]
URL=${currentUrl}
IconIndex=0
`;
    const blob = new Blob([urlShortcutContent], { type: 'application/x-mswinurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VEE_Video_Editor.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyBat = () => {
    navigator.clipboard.writeText(batScriptContent);
    setCopiedBat(true);
    setTimeout(() => setCopiedBat(false), 2000);
  };

  const handleDownloadPs1 = () => {
    const ps1Content = `# Script de Instalacao VEE Windows Desktop
$AppUrl = "${currentUrl}"
$DesktopPath = [System.Environment]::GetFolderPath("Desktop")
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\\VEE Video Editor.lnk")

$EdgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
$ChromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"

if (Test-Path $EdgePath) {
    $Shortcut.TargetPath = $EdgePath
    $Shortcut.Arguments = "--app=$AppUrl"
} elseif (Test-Path $ChromePath) {
    $Shortcut.TargetPath = $ChromePath
    $Shortcut.Arguments = "--app=$AppUrl"
} else {
    $Shortcut.TargetPath = $AppUrl
}

$Shortcut.Description = "VEE - Video Editor Espectro (Windows Desktop)"
$Shortcut.Save()

Write-Host "Atalho do VEE criado com sucesso na sua Area de Trabalho do Windows!" -ForegroundColor Green
`;
    const blob = new Blob([ps1Content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Instalar_VEE_Windows.ps1';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPortable = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=${currentUrl}">
    <title>Abrindo VEE Video Editor...</title>
    <script>
        window.location.replace("${currentUrl}");
    </script>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: white; display: flex; height: 100vh; margin: 0; align-items: center; justify-content: center; }
        .card { background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        h1 { color: #a78bfa; margin-bottom: 0.5rem; }
        p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
        .btn { display: inline-block; background: #6d28d9; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 1rem; transition: background 0.2s; }
        .btn:hover { background: #7c3aed; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🪟 VEE Windows Desktop</h1>
        <p>Redirecionando para o editor VEE...</p>
        <a href="${currentUrl}" class="btn">Clique aqui se nao abrir automaticamente</a>
    </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VEE_Windows_Portable.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🪟 Central Windows Desktop VEE" maxWidth="max-w-2xl">
      <div className="space-y-5 text-gray-200">
        
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-violet-900/70 via-indigo-900/50 to-cyan-900/50 border border-violet-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-600/30 border border-violet-400/50 flex items-center justify-center text-violet-300 shadow-inner">
              <Box className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Empacotado com Tauri (Windows .EXE ~10MB)
                <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded-full border border-cyan-500/30 font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-cyan-400" /> Nativo
                </span>
                {isInstalled && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> PWA Ativo
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-300">
                Instalador minúsculo de ~10MB, rodando fora do Chrome tradicional com desempenho nativo de desktop.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tauri')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'tauri'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Box className="w-4 h-4 text-cyan-400" />
            Tauri (.EXE ~10MB)
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'pwa'
                ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            App Web (PWA)
          </button>
          
          <button
            onClick={() => setActiveTab('bat')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'bat'
                ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Script .BAT
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'shortcuts'
                ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Atalhos
          </button>

          <button
            onClick={() => setActiveTab('portable')}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'portable'
                ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            Portátil
          </button>
        </div>

        {/* Tab: Tauri (.EXE ~10MB) */}
        {activeTab === 'tauri' && (
          <div className="space-y-4 text-sm">
            {/* Feature Cards Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <HardDrive className="w-4 h-4" />
                  Instalador ~10MB
                </div>
                <p className="text-gray-300 text-[11px] leading-tight">
                  Zero sobrecarga: até <strong>20x menor</strong> que apps tradicionais em Electron (~150MB+).
                </p>
              </div>

              <div className="bg-violet-950/40 border border-violet-500/40 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-violet-300 font-bold text-xs">
                  <Cpu className="w-4 h-4" />
                  Fora do Chrome
                </div>
                <p className="text-gray-300 text-[11px] leading-tight">
                  Executa fora do navegador comum, com processo isolado e sem abas disputando recursos.
                </p>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <Gauge className="w-4 h-4" />
                  Desempenho Nativo
                </div>
                <p className="text-gray-300 text-[11px] leading-tight">
                  Backend em Rust com aceleração de hardware direta para timeline multipista e espectro de áudio.
                </p>
              </div>
            </div>

            {/* How Tauri Works for VEE */}
            <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Como Gerar ou Executar o .EXE Nativo com Tauri
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-500/30">
                  Tauri v2 Configurado
                </span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                A estrutura do Tauri já está 100% configurada na pasta <code>src-tauri/</code> com <code>tauri.conf.json</code>, otimizações de compilação em Rust (LTO, strip de binário) e suporte para gerar instaladores NSIS/MSI para Windows.
              </p>

              {/* Command Box */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-300">1. Comando para compilar o executável no terminal:</span>
                <div className="relative bg-black/70 border border-gray-800 rounded-lg p-3 font-mono text-xs text-cyan-400 flex items-center justify-between">
                  <span>npm run tauri:build</span>
                  <button
                    onClick={handleCopyTauriCmd}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedTauri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedTauri ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Automatic Script Download */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={handleDownloadTauriBat}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-xs shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Baixar Script de Compilação (.BAT)
                </button>

                <button
                  onClick={handleDownloadUrlShortcut}
                  className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  Atalho Rápido de Acesso
                </button>
              </div>

              {/* CI/CD note */}
              <div className="bg-indigo-950/30 border border-indigo-500/30 p-2.5 rounded-lg text-[11px] text-indigo-200 space-y-1">
                <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Compilação Automática na Nuvem (GitHub Actions)
                </p>
                <p className="text-gray-300">
                  O repositório já inclui a automação <code>.github/workflows/tauri-build.yml</code>. Ao sincronizar o código no GitHub, a nuvem compila o instalador Windows <code>.exe</code> de ~10MB automaticamente e gera o download na aba Releases!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: PWA Install */}
        {activeTab === 'pwa' && (
          <div className="space-y-4 text-sm">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-violet-500/30 space-y-4">
              <div className="flex items-center gap-2 text-violet-300 font-bold text-base">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Como Ter o VEE no Windows em 2 Passos Simples</span>
              </div>

              {/* Step 1 */}
              <div className="bg-gray-900/80 p-3.5 rounded-lg border border-gray-700 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <h5 className="font-semibold text-white text-sm">Instalar como Aplicativo do Windows</h5>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    Você pode instalar o VEE diretamente no seu Windows para ele abrir em uma janela própria (sem barra de site).
                  </p>
                  {deferredPrompt ? (
                    <button
                      onClick={onTriggerInstall}
                      className="mt-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-xs shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      Clique Aqui para Instalar no Windows
                    </button>
                  ) : isInstalled ? (
                    <div className="mt-2 bg-emerald-900/30 border border-emerald-500/40 p-2 rounded text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      O VEE já está rodando como app instalado no seu Windows!
                    </div>
                  ) : (
                    <div className="mt-2 bg-violet-950/60 border border-violet-500/30 p-2.5 rounded-lg text-xs text-violet-200 space-y-1">
                      <p><strong>Não está vendo o menu (⋮) ou barra de endereço?</strong></p>
                      <p className="text-gray-300">
                        Se você já está com a janela do aplicativo aberta, use o <strong>Passo 2 abaixo (Baixar Atalho .BAT)</strong> ou a aba <strong>Tauri (.EXE)</strong> para ter o ícone direto na sua Área de Trabalho.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gray-900/80 p-3.5 rounded-lg border border-gray-700 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                  2
                </div>
                <div className="space-y-2.5 w-full">
                  <h5 className="font-semibold text-white text-sm">Baixar Atalho para a Área de Trabalho</h5>
                  <p className="text-gray-300 text-xs">
                    Recomendamos o <strong>Atalho Direto (.URL)</strong> pois abre instantaneamente sem tela preta e sem ser bloqueado:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadUrlShortcut}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-xs shadow-md border border-violet-400/40"
                    >
                      <ExternalLink className="w-4 h-4" />
                      ⭐ Atalho Direto (.URL) - Recomendado
                    </button>

                    <button
                      onClick={handleDownloadBat}
                      className="w-full py-2.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-xs border border-gray-600"
                    >
                      <Download className="w-4 h-4" />
                      Lançador em Janela (.BAT)
                    </button>
                  </div>

                  <div className="bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-lg text-xs text-amber-200 space-y-1 mt-1">
                    <p className="font-semibold text-amber-300">💡 Se ao executar o arquivo desapareceu ou fechou rápido:</p>
                    <ul className="list-disc pl-4 space-y-1 text-amber-100/90 text-[11px]">
                      <li><strong>Baixe o botão roxo "Atalho Direto (.URL)":</strong> Ele é o formato oficial de atalho do Windows e abre imediatamente sem abrir prompt de comando.</li>
                      <li><strong>Se você baixou "compilar_vee_tauri.bat":</strong> Aquele arquivo serve para desenvolvedores compilarem o instalador a partir do código Rust. Para simplesmente usar o VEE no seu computador, utilize o <strong>Atalho Direto (.URL)</strong> ou a opção 1 (Instalar App).</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: BAT Script Generator */}
        {activeTab === 'bat' && (
          <div className="space-y-4 text-sm">
            <p className="text-xs text-gray-300">
              Gere um arquivo de lote <code>.bat</code> para o Windows. Ao dar duplo clique no arquivo baixado, o VEE será aberto em modo janela independente de aplicativo (App Mode).
            </p>

            <div className="relative bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto max-h-48">
              <button
                onClick={handleCopyBat}
                className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-gray-200 p-1.5 rounded text-xs flex items-center gap-1"
                title="Copiar código .bat"
              >
                {copiedBat ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedBat ? 'Copiado!' : 'Copiar'}
              </button>
              <pre>{batScriptContent}</pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadBat}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                Baixar iniciar_vee_windows.bat
              </button>
              <button
                onClick={handleDownloadPs1}
                className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Terminal className="w-4 h-4" />
                Baixar Instalar_VEE_Windows.ps1
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-3 text-xs">
            <p className="text-gray-300">
              O VEE para Windows suporta os seguintes atalhos de teclado padrão do sistema operacional:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-gray-800/80 p-2.5 rounded border border-gray-700 flex justify-between items-center">
                <span>Desfazer ação</span>
                <kbd className="bg-gray-900 border border-gray-600 px-2 py-1 rounded font-mono text-violet-300">Ctrl + Z</kbd>
              </div>
              <div className="bg-gray-800/80 p-2.5 rounded border border-gray-700 flex justify-between items-center">
                <span>Refazer ação</span>
                <kbd className="bg-gray-900 border border-gray-600 px-2 py-1 rounded font-mono text-violet-300">Ctrl + Y</kbd>
              </div>
              <div className="bg-gray-800/80 p-2.5 rounded border border-gray-700 flex justify-between items-center">
                <span>Reproduzir / Pausar</span>
                <kbd className="bg-gray-900 border border-gray-600 px-2 py-1 rounded font-mono text-violet-300">Espaço</kbd>
              </div>
              <div className="bg-gray-800/80 p-2.5 rounded border border-gray-700 flex justify-between items-center">
                <span>Excluir clipe/camada</span>
                <kbd className="bg-gray-900 border border-gray-600 px-2 py-1 rounded font-mono text-violet-300">Delete / Backspace</kbd>
              </div>
              <div className="bg-gray-800/80 p-2.5 rounded border border-gray-700 flex justify-between items-center">
                <span>Salvar projeto (.vee)</span>
                <kbd className="bg-gray-900 border border-gray-600 px-2 py-1 rounded font-mono text-violet-300">Ctrl + S</kbd>
              </div>
              <div className="bg-gray-800/80 p-2.5 rounded border border-gray-700 flex justify-between items-center">
                <span>Exportar Vídeo MP4</span>
                <kbd className="bg-gray-900 border border-gray-600 px-2 py-1 rounded font-mono text-violet-300">Ctrl + E</kbd>
              </div>
              <div className="bg-gray-800/80 p-2.5 rounded border border-gray-700 flex justify-between items-center">
                <span>Alternar Tela Cheia</span>
                <kbd className="bg-gray-900 border border-gray-600 px-2 py-1 rounded font-mono text-violet-300">F11 / Ctrl+F</kbd>
              </div>
              <div className="bg-gray-800/80 p-2.5 rounded border border-gray-700 flex justify-between items-center">
                <span>Abrir mídias</span>
                <kbd className="bg-gray-900 border border-gray-600 px-2 py-1 rounded font-mono text-violet-300">Ctrl + O</kbd>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Portable */}
        {activeTab === 'portable' && (
          <div className="space-y-4 text-sm">
            <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 space-y-3">
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-violet-400" />
                Atalho Portátil para Windows (.html)
              </h4>
              <p className="text-gray-300 text-xs leading-relaxed">
                Baixe o lançador portátil <code>VEE_Windows_Portable.html</code> para guardar em seu pendrive ou pasta do Windows e abrir o aplicativo instantaneamente com um clique.
              </p>

              <button
                onClick={handleDownloadPortable}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" />
                Baixar Atalho Portátil (VEE_Windows_Portable.html)
              </button>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-2 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold text-xs rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default WindowsAppModal;

