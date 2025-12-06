import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center bg-sacred-blue relative overflow-hidden p-4"
    >
      {/* Background decorativo */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1px, transparent 0)',
             backgroundSize: '40px 40px' 
           }} 
      />

      <div className="w-full max-w-md bg-sacred-blue/80 backdrop-blur-lg border border-sacred-gold/30 rounded-xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sacred-gold/10 border border-sacred-gold flex items-center justify-center">
            <span className="text-sacred-gold font-serif text-3xl">A</span>
          </div>
          <h2 className="font-serif text-3xl text-sacred-white mb-2">Bem-vindo</h2>
          <p className="text-sacred-beige/80 text-sm">Acesse sua área de membros</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-200 text-sm">
              {error}
            </div>
          )}
          
          <Input 
            label="Email" 
            type="email" 
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <div className="space-y-1">
            <Input 
              label="Senha" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="text-right">
              <Link to="/recovery" className="text-xs text-sacred-gold hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-sacred-beige/60">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-sacred-gold font-semibold hover:underline">
            Registre-se
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
