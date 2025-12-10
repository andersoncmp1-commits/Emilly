import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { User, Shield, Camera, Save, ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Settings() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile Form
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Form
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setNickname(profile.nickname || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const updates: any = {
        id: user?.id,
        full_name: fullName,
        nickname: nickname,
        phone: phone,
        updated_at: new Date().toISOString(),
      };

      // Ensure profile exists or update it. Upsert is good.
      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não conferem.' });
      return;
    }

    if (password.length < 6) {
        setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
        return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao atualizar senha.' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para fazer upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
          throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // Update profile immediately with new avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);
      
      if (updateError) throw updateError;
      
      setMessage({ type: 'success', text: 'Foto de perfil atualizada!' });

    } catch (error: any) {
        console.error(error);
        setMessage({ type: 'error', text: error.message || 'Erro no upload da imagem.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 mb-4">
            <Link to="/dashboard" className="text-sacred-gold hover:text-sacred-beige transition-colors flex items-center gap-2 text-sm">
                <ArrowLeft size={16} />
                Voltar para Home
            </Link>
            <div>
                <h1 className="text-3xl font-serif text-sacred-white mb-2">CONFIGURAÇÕES</h1>
                <p className="text-sacred-beige/60">Gerencie sua conta e preferências.</p>
            </div>
        </div>

        {message && (
             <div className={`p-4 rounded-md border ${message.type === 'success' ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}>
                {message.text}
             </div>
        )}

        {/* Perfil Section */}
        <div className="bg-sacred-blue/40 border border-sacred-gold/10 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-sacred-gold/10 pb-4">
                <User className="text-sacred-gold" size={24} />
                <h2 className="text-xl font-serif text-sacred-white">Perfil</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-32 h-32 rounded-full border-2 border-sacred-gold/30 overflow-hidden group bg-black/40">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sacred-gold/30">
                                <User size={48} />
                            </div>
                        )}
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-sacred-white"
                        >
                            <Camera size={24} />
                        </button>
                    </div>
                     <input
                        type="file"
                        id="avatar"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploading}
                    />
                    {uploading && <span className="text-xs text-sacred-gold animate-pulse">Enviando...</span>}
                </div>

                {/* Fields */}
                <div className="flex-1 space-y-4">
                    <div className="grid gap-1.5">
                         <label className="text-sm font-medium text-sacred-beige/80 ml-1">E-mail</label>
                         <div className="w-full px-4 py-3 bg-sacred-blue/30 border border-sacred-gold/10 rounded-md text-sacred-white/50 cursor-not-allowed">
                             {user?.email}
                         </div>
                         <span className="text-xs text-sacred-gray/50 ml-1">O e-mail não pode ser alterado.</span>
                    </div>

                    <Input 
                        label="Nome Completo"
                        placeholder="Seu nome completo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />

                    <Input 
                        label="Apelido (Como você quer ser chamado)"
                        placeholder="Seu apelido"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                    />

                    <Input 
                        label="Telefone (WhatsApp)"
                        placeholder="(DDD) 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleUpdateProfile} disabled={loading}>
                            {loading && !password ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Salvar Perfil
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        {/* Segurança Section */}
        <div className="bg-sacred-blue/40 border border-sacred-gold/10 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-sacred-gold/10 pb-4">
                <Shield className="text-sacred-gold" size={24} />
                <h2 className="text-xl font-serif text-sacred-white">Segurança</h2>
            </div>
            
            <div className="space-y-4">
                <Input 
                    type="password"
                    label="Nova Senha"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <Input 
                    type="password"
                    label="Confirmar Nova Senha"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <div className="flex justify-end pt-4">
                     <Button variant="secondary" onClick={handleUpdatePassword} disabled={loading}>
                        {loading && password ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Atualizar Senha
                    </Button>
                </div>
            </div>
        </div>

        {/* Logout Section */}
        <div className="bg-sacred-blue/40 backdrop-blur-md border border-red-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <LogOut size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-serif text-sacred-white">Sair da Conta</h2>
                <p className="text-sacred-beige/60 text-sm">Encerrar sessão no dispositivo atual</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-red-500/10">
              <div>
                <p className="text-sacred-beige text-sm">
                  Você está logado como <span className="text-sacred-white font-medium">{user?.email}</span>
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
              >
                <LogOut size={18} className="mr-2" />
                Sair
              </Button>
            </div>
        </div>

      </div>
    </Layout>
  );
}
