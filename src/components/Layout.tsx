import { useMemo, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../contexts/SettingsContext';
import { User as UserIcon, Settings, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

// Layout principal com Header e Background - Cores dinâmicas
export function Layout({ children }: LayoutProps) {
  const { user, isAdmin, profile } = useAuth();
  const { settings, isDarkMode, toggleTheme } = useSettings();

  // Logo dinâmica (do settings ou fallback)
  const logoUrl = settings?.logo_url || 'https://i.imgur.com/3vqvsBH.png';
  const projectName = settings?.project_name || 'Apostolado Imaculada Corredentora';
  
  // Gerar SVG pattern dinamicamente com a cor gold do tema
  const patternSvg = useMemo(() => {
    const goldColor = settings?.colors?.gold || '#C5A059';
    // URL encode the color for SVG data URL
    const encodedColor = encodeURIComponent(goldColor);
    return `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='${encodedColor}' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;
  }, [settings?.colors?.gold]);

  return (
    <div className="min-h-screen bg-sacred-blue relative overflow-hidden flex flex-col">
      {/* Background Pattern - Usando cores do tema */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial Gradient - usa sacred-gray e sacred-blue */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 0%, rgb(var(--color-sacred-gray)) 0%, rgb(var(--color-sacred-blue)) 80%)`
          }}
        />
        
        {/* Arabesque Pattern Overlay - gerado dinamicamente */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: patternSvg,
            backgroundSize: '60px 60px' 
          }} 
        />
      </div>
      
      {/* Header */}
      <header className="relative z-10 bg-sacred-blue/90 backdrop-blur-md border-b border-sacred-gold/30 h-20">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
            {/* Logo Dinâmica */}
            <img 
              src={logoUrl} 
              alt={projectName} 
              className="h-16 w-auto object-contain"
            />
            <div>
              <h1 className="font-serif text-xl text-sacred-white tracking-wide">
                {projectName.split(' ')[0] || 'Apostolado'}
              </h1>
              <p className="text-xs text-sacred-beige uppercase tracking-widest">
                {projectName.split(' ').slice(1).join(' ') || 'Imaculada Corredentora'}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-sacred-beige">
              <Link to="/settings" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                 <div className="w-8 h-8 rounded-full bg-sacred-white/5 flex items-center justify-center overflow-hidden border border-sacred-gold/20 group-hover:border-sacred-gold/50 transition-colors">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={16} />
                    )}
                 </div>
                   <span className="font-medium hidden md:block">
                   {profile?.nickname || profile?.full_name || user?.user_metadata?.name || user?.email || 'Visitante'}
                 </span>
              </Link>
              
              {/* Theme Toggle Button */}
              <button 
                onClick={toggleTheme}
                className="text-sacred-gold/70 hover:text-sacred-gold transition-colors p-1 hover:bg-sacred-gold/10 rounded-lg"
                title={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <Link to="/settings" className="text-sacred-gold/70 hover:text-sacred-gold transition-colors" title="Configurações">
                <Settings size={20} />
              </Link>
            </div>

            {isAdmin && (
              <Link to="/admin" className="text-sacred-gold/70 hover:text-sacred-gold transition-colors text-sm font-semibold">
                ADMIN
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 container mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
}
