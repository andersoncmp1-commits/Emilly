import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

// Layout principal com Header e Background
export function Layout({ children }: LayoutProps) {
  const { user, signOut, isAdmin, profile, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-sacred-blue relative overflow-hidden flex flex-col">
      {/* Background Pattern - Arabescos discretos (CSS puro ou imagem) */}
      {/* Background Gradient & Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial Gradient for Spotlight Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(42,36,32,1)_0%,rgba(15,12,11,1)_80%)]" />
        
        {/* Arabesque Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C5A059' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
               backgroundSize: '60px 60px' 
             }} 
        />
      </div>
      
      {/* Header */}
      <header className="relative z-10 bg-sacred-blue/90 backdrop-blur-md border-b border-sacred-gold/30 h-20">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
            {/* Logo */}
            <img 
              src="https://i.imgur.com/3vqvsBH.png" 
              alt="Apostolado Imaculada Corredentora" 
              className="h-16 w-auto object-contain"
            />
            <div>
              <h1 className="font-serif text-xl text-sacred-white tracking-wide">Apostolado</h1>
              <p className="text-xs text-sacred-beige uppercase tracking-widest">Imaculada Corredentora</p>
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
                   {/* DEBUG INFO */}
                   <span className="ml-2 text-xs text-red-400 bg-red-900/20 px-1 rounded">
                     {loading ? '...' : (profile?.role || 'no-role')}
                   </span>
                 </span>
              </Link>
              
              <Link to="/settings" className="text-sacred-gold/70 hover:text-sacred-gold transition-colors" title="Configurações">
                <Settings size={20} />
              </Link>
            </div>

            {isAdmin && (
              <Link to="/admin" className="text-sacred-gold/70 hover:text-sacred-gold transition-colors text-sm font-semibold">
                ADMIN
              </Link>
            )}
            
            <button 
              onClick={handleLogout}
              className="text-sacred-gold/70 hover:text-sacred-gold transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
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
