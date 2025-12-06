import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';

export function Recovery() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center bg-sacred-blue relative overflow-hidden p-4"
    >
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1px, transparent 0)',
             backgroundSize: '40px 40px' 
           }} 
      />

      <div className="w-full max-w-md bg-sacred-blue/80 backdrop-blur-lg border border-sacred-gold/30 rounded-xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative z-10">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl text-sacred-white mb-2">Recuperar Senha</h2>
          <p className="text-sacred-beige/80 text-sm">Enviaremos um link para seu email</p>
        </div>

        {sent ? (
          <div className="text-center space-y-6">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-200">
              Email de recuperação enviado com sucesso! Verifique sua caixa de entrada.
            </div>
            <Link to="/login">
              <Button className="w-full">Voltar para Login</Button>
            </Link>
          </div>
        ) : (
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Link'}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-sacred-gold hover:underline">
                Voltar para Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
