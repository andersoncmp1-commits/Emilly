import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';

export function MagicLinkLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
       setError('Por favor, digite seu email.');
       return;
    }
    
    setLoading(true);
    setError(null);
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                // Forçamos a URL de produção para garantir que não haja erro de localhost
                emailRedirectTo: 'https://app.corredentora.com.br/dashboard',
            },
        });

        if (error) {
            let message = error.message;
            if (message.includes('For security purposes, you can only request this after')) {
                const seconds = message.match(/\d+/)?.[0] || 'alguns';
                message = `Por segurança, aguarde ${seconds} segundos antes de tentar novamente.`;
            }
            setError(message);
        } else {
            setSent(true);
        }
    } catch (err) {
        setError('Ocorreu um erro inesperado.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen flex items-center justify-center bg-sacred-blue relative overflow-hidden p-4"
    >
      {/* Background Decorativo */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1px, transparent 0)',
             backgroundSize: '40px 40px' 
           }} 
      />

      <div className="w-full max-w-md bg-sacred-blue/80 backdrop-blur-lg border border-sacred-gold/30 rounded-xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative z-10 text-center">
        {!sent ? (
             <>
                <div className="flex justify-start mb-4">
                    <Link to="/login" className="flex items-center gap-2 text-sacred-beige/60 hover:text-sacred-gold transition-colors text-sm">
                        <ArrowLeft size={16} /> Voltar para Login
                    </Link>
                </div>

                <div className="mb-8">
                    <h2 className="font-serif text-2xl text-sacred-gold mb-2 uppercase tracking-wide">Entrar sem senha</h2>
                    <p className="text-sacred-beige/60 italic text-sm">Receba um link de acesso no seu e-mail.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <Input 
                        label="E-mail" 
                        type="email" 
                        placeholder="nome@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <Button type="submit" className="w-full bg-sacred-gold text-sacred-blue hover:bg-sacred-gold/90 font-bold" disabled={loading}>
                        {loading ? 'Enviando Link...' : 'Enviar Link Mágico'}
                    </Button>
                </form>
             </>
        ) : (
            <div className="py-8">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 border border-green-500/30">
                    <Mail size={32} />
                </div>
                <h3 className="font-serif text-2xl text-sacred-white mb-4">Verifique seu E-mail</h3>
                <p className="text-sacred-beige/80 mb-8">
                    Enviamos um link de acesso para <strong>{email}</strong>. <br/>
                    Clique no link para entrar automaticamente.
                </p>
                <Button variant="outline" onClick={() => setSent(false)} className="w-full">
                    Tentar outro email
                </Button>
            </div>
        )}
      </div>
    </motion.div>
  );
}
