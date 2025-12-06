import { useState, useEffect } from 'react';
import { Download, Share, Smartphone, Menu, PlusSquare } from 'lucide-react';
import { Button } from './Button';
import { motion } from 'framer-motion';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Capture install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
        // If no prompt available (already installed or unsupported), show instructions
        setShowInstructions(true);
    }
  };

  return (
    <div className="my-8 p-6 bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl">
      <h3 className="text-xl font-serif text-sacred-white mb-4 flex items-center gap-2">
        <Smartphone className="text-sacred-gold" />
        Instale o Aplicativo
      </h3>
      
      <p className="text-sacred-beige/80 mb-6">
        Tenha acesso rápido aos cursos e conteúdos diretamente da tela inicial do seu celular, com uma experiência otimizada e sem distrações.
      </p>

      {/* Main Install Button (Works for Android/Desktop Chrome usually) */}
      {!isIOS && (
        <div className="mb-6">
           <Button onClick={handleInstallClick} className="w-full sm:w-auto">
             <Download size={20} className="mr-2" />
             {deferredPrompt ? 'Instalar Agora' : 'Como Instalar'}
           </Button>
        </div>
      )}

      {/* iOS Instructions */}
      {isIOS && (
        <div className="bg-sacred-blue/50 p-4 rounded-lg border border-sacred-gold/10">
           <h4 className="font-semibold text-sacred-gold mb-3 flex items-center gap-2">
             <span className="text-lg"></span> iPhone / iPad
           </h4>
           <ol className="space-y-3 text-sm text-sacred-beige/90 list-decimal pl-4">
             <li className="pl-2">
                Toque no botão de <strong>Compartilhar</strong> <Share size={14} className="inline mx-1" /> na barra inferior do Safari.
             </li>
             <li className="pl-2">
                Role para baixo e selecione <strong>Adicionar à Tela de Início</strong> <PlusSquare size={14} className="inline mx-1" />.
             </li>
             <li className="pl-2">
                Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
             </li>
           </ol>
        </div>
      )}

      {/* Android Instructions (Fallback or Explicit) */}
      {/* Show only if requested or if it's android but prompt didn't fire (e.g. already installed or blocked) */}
      {(showInstructions || (isAndroid && !deferredPrompt)) && !isIOS && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-sacred-blue/50 p-4 rounded-lg border border-sacred-gold/10 mt-4"
          >
             <h4 className="font-semibold text-sacred-gold mb-3 flex items-center gap-2">
                <span className="text-lg">🤖</span> Android (Chrome)
             </h4>
             <ol className="space-y-3 text-sm text-sacred-beige/90 list-decimal pl-4">
               <li className="pl-2">
                  Toque no ícone de <strong>Menu</strong> (três pontos) <Menu size={14} className="inline mx-1" /> no canto superior do navegador.
               </li>
               <li className="pl-2">
                  Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
               </li>
               <li className="pl-2">
                  Confirme a instalação quando solicitado.
               </li>
             </ol>
          </motion.div>
      )}
    </div>
  );
}
