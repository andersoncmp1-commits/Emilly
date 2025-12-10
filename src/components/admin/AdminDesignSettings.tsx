import { useState, useRef, useEffect } from 'react';
import { useSettings, DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../Button';
import { Input } from '../Input';
import { Save, Upload, RefreshCw, Palette, Eye, RotateCcw, Moon, Sun, Plus, Trash2, X } from 'lucide-react';

type ColorKey = 'blue' | 'gold' | 'beige' | 'white' | 'gray';

interface ColorsType {
  blue: string;
  gold: string;
  beige: string;
  white: string;
  gray: string;
}

interface CustomTheme {
  id: string;
  name: string;
  colors: ColorsType;
}

export function AdminDesignSettings() {
  const { 
    settings, 
    updateSettings, 
    loading: settingsLoading,
    isDarkMode,
    darkTheme,
    lightTheme,
    updateDarkTheme,
    updateLightTheme,
    toggleTheme
  } = useSettings();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Which theme are we editing? 'dark' or 'light'
  const [editingTheme, setEditingTheme] = useState<'dark' | 'light'>('dark');

  // Local state for editing
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || '');
  const [projectName, setProjectName] = useState(settings?.project_name || '');
  const [darkColors, setDarkColors] = useState<ColorsType>(darkTheme);
  const [lightColors, setLightColors] = useState<ColorsType>(lightTheme);

  // Custom themes
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [showSaveThemeModal, setShowSaveThemeModal] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [themeToDelete, setThemeToDelete] = useState<CustomTheme | null>(null);

  // Sync state when settings/themes load
  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.logo_url || '');
      setProjectName(settings.project_name || '');
    }
  }, [settings]);

  useEffect(() => {
    setDarkColors(darkTheme);
  }, [darkTheme]);

  useEffect(() => {
    setLightColors(lightTheme);
  }, [lightTheme]);

  // Load custom themes from localStorage
  useEffect(() => {
    const savedThemes = localStorage.getItem('customThemes');
    if (savedThemes) {
      try {
        setCustomThemes(JSON.parse(savedThemes));
      } catch {
        console.error('Failed to parse custom themes');
      }
    }
  }, []);

  const saveCustomThemesToStorage = (themes: CustomTheme[]) => {
    localStorage.setItem('customThemes', JSON.stringify(themes));
    setCustomThemes(themes);
  };

  // Apply colors live when preview mode is on
  useEffect(() => {
    if (previewMode) {
      const colors = editingTheme === 'dark' ? darkColors : lightColors;
      applyColorsToDOM(colors);
    }
  }, [darkColors, lightColors, previewMode, editingTheme]);

  const hexToRgb = (hex: string): string => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r} ${g} ${b}`;
  };

  const applyColorsToDOM = (colorsToApply: ColorsType) => {
    const root = document.documentElement;
    root.style.setProperty('--color-sacred-blue', hexToRgb(colorsToApply.blue));
    root.style.setProperty('--color-sacred-gold', hexToRgb(colorsToApply.gold));
    root.style.setProperty('--color-sacred-beige', hexToRgb(colorsToApply.beige));
    root.style.setProperty('--color-sacred-white', hexToRgb(colorsToApply.white));
    root.style.setProperty('--color-sacred-gray', hexToRgb(colorsToApply.gray));
  };

  const handleColorChange = (key: ColorKey, value: string) => {
    if (editingTheme === 'dark') {
      setDarkColors(prev => ({ ...prev, [key]: value }));
    } else {
      setLightColors(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleApplyPreset = (themeColors: ColorsType) => {
    if (editingTheme === 'dark') {
      setDarkColors(themeColors);
    } else {
      setLightColors(themeColors);
    }
    if (previewMode) {
      applyColorsToDOM(themeColors);
    }
  };

  const handleResetToDefault = () => {
    if (editingTheme === 'dark') {
      setDarkColors(DEFAULT_DARK_THEME);
      if (previewMode) applyColorsToDOM(DEFAULT_DARK_THEME);
    } else {
      setLightColors(DEFAULT_LIGHT_THEME);
      if (previewMode) applyColorsToDOM(DEFAULT_LIGHT_THEME);
    }
  };

  const togglePreview = () => {
    if (!previewMode) {
      const colors = editingTheme === 'dark' ? darkColors : lightColors;
      applyColorsToDOM(colors);
    } else {
      // Revert to current active theme
      const colors = isDarkMode ? darkTheme : lightTheme;
      applyColorsToDOM(colors);
    }
    setPreviewMode(!previewMode);
  };

  // Save current colors as a custom theme
  const handleSaveAsTheme = () => {
    if (!newThemeName.trim()) {
      setMessage({ type: 'error', text: 'Digite um nome para o tema.' });
      return;
    }

    const currentColors = editingTheme === 'dark' ? darkColors : lightColors;
    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: newThemeName.trim(),
      colors: { ...currentColors }
    };

    const updatedThemes = [...customThemes, newTheme];
    saveCustomThemesToStorage(updatedThemes);
    
    setNewThemeName('');
    setShowSaveThemeModal(false);
    setMessage({ type: 'success', text: `Tema "${newTheme.name}" salvo com sucesso!` });
  };

  const handleDeleteTheme = (theme: CustomTheme) => {
    const updatedThemes = customThemes.filter(t => t.id !== theme.id);
    saveCustomThemesToStorage(updatedThemes);
    setThemeToDelete(null);
    setMessage({ type: 'success', text: `Tema "${theme.name}" excluído.` });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);
      setMessage(null);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      setMessage({ type: 'success', text: 'Logo carregada com sucesso!' });
    } catch (error: unknown) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao fazer upload da logo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Save logo and project name
      await updateSettings({
        logo_url: logoUrl,
        project_name: projectName,
      });

      // Save both themes
      await updateDarkTheme(darkColors);
      await updateLightTheme(lightColors);

      setPreviewMode(false);
      setMessage({ type: 'success', text: 'Configurações visuais salvas com sucesso!' });
    } catch (error: unknown) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="animate-spin text-sacred-gold" size={32} />
      </div>
    );
  }

  const colorFields: { key: ColorKey; label: string; description: string }[] = [
    { key: 'blue', label: 'Cor de Fundo', description: 'Fundo principal do app' },
    { key: 'gold', label: 'Cor de Destaque', description: 'Botões, links e destaques' },
    { key: 'beige', label: 'Texto Secundário', description: 'Textos menos importantes' },
    { key: 'white', label: 'Texto Principal', description: 'Títulos e textos principais' },
    { key: 'gray', label: 'Bordas/Detalhes', description: 'Linhas e elementos sutis' },
  ];

  const currentColors = editingTheme === 'dark' ? darkColors : lightColors;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-sacred-white flex items-center gap-2">
            <Palette className="text-sacred-gold" /> Identidade Visual
          </h2>
          <p className="text-sacred-beige/60">Personalize a aparência do aplicativo.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={previewMode ? 'primary' : 'outline'} 
            size="sm"
            onClick={togglePreview}
          >
            <Eye size={16} className="mr-1" />
            {previewMode ? 'Preview Ativo' : 'Ver Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetToDefault}>
            <RotateCcw size={16} className="mr-1" />
            Restaurar Padrão
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSaveThemeModal(true)}>
            <Plus size={16} className="mr-1" />
            Salvar Tema
          </Button>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-900/20 border-green-500/50 text-green-400' 
            : 'bg-red-900/20 border-red-500/50 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Theme Mode Selector */}
      <div className="bg-sacred-blue/40 border border-sacred-gold/10 rounded-lg p-6">
        <h3 className="text-lg font-serif text-sacred-gold mb-4">Escolha qual tema editar</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setEditingTheme('dark')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              editingTheme === 'dark'
                ? 'border-sacred-gold bg-sacred-gold/10'
                : 'border-sacred-gold/20 hover:border-sacred-gold/40'
            }`}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Moon size={24} className={editingTheme === 'dark' ? 'text-sacred-gold' : 'text-sacred-beige/50'} />
              <span className={`font-semibold ${editingTheme === 'dark' ? 'text-sacred-white' : 'text-sacred-beige/70'}`}>
                Tema Escuro
              </span>
            </div>
            <div className="flex gap-1 justify-center">
              {Object.values(darkColors).map((color, i) => (
                <div 
                  key={i} 
                  className="w-6 h-6 rounded-full border border-white/20"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>

          <button
            onClick={() => setEditingTheme('light')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              editingTheme === 'light'
                ? 'border-sacred-gold bg-sacred-gold/10'
                : 'border-sacred-gold/20 hover:border-sacred-gold/40'
            }`}
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <Sun size={24} className={editingTheme === 'light' ? 'text-sacred-gold' : 'text-sacred-beige/50'} />
              <span className={`font-semibold ${editingTheme === 'light' ? 'text-sacred-white' : 'text-sacred-beige/70'}`}>
                Tema Claro
              </span>
            </div>
            <div className="flex gap-1 justify-center">
              {Object.values(lightColors).map((color, i) => (
                <div 
                  key={i} 
                  className="w-6 h-6 rounded-full border border-white/20"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>
        </div>

        {/* Current mode indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-sacred-beige/60">
          <span>Modo atual do app:</span>
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-1 text-sacred-gold hover:underline"
          >
            {isDarkMode ? <Moon size={14} /> : <Sun size={14} />}
            {isDarkMode ? 'Escuro' : 'Claro'}
          </button>
          <span className="text-sacred-beige/40">(clique para alternar)</span>
        </div>
      </div>

      {/* Preview Banner */}
      {previewMode && (
        <div className="p-3 rounded-lg bg-sacred-gold/20 border border-sacred-gold/40 text-sacred-gold text-sm flex items-center gap-2">
          <Eye size={16} />
          <span>Preview do tema {editingTheme === 'dark' ? 'escuro' : 'claro'} ativo! Salve para confirmar.</span>
        </div>
      )}

      {/* Custom Themes */}
      {customThemes.length > 0 && (
        <div className="bg-sacred-blue/40 border border-sacred-gold/10 rounded-lg p-6">
          <h3 className="text-lg font-serif text-sacred-gold mb-4 flex items-center gap-2">
            <Palette size={20} /> Meus Temas Personalizados
          </h3>
          <p className="text-sacred-beige/60 text-sm mb-4">
            Clique para aplicar ao tema {editingTheme === 'dark' ? 'escuro' : 'claro'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {customThemes.map((theme) => (
              <div
                key={theme.id}
                className="group relative p-3 rounded-lg border border-sacred-gold/20 hover:border-sacred-gold/50 transition-all bg-black/20 hover:bg-black/40"
              >
                <button
                  onClick={() => handleApplyPreset(theme.colors)}
                  className="w-full"
                >
                  <div className="flex gap-1 mb-2 justify-center">
                    {Object.values(theme.colors).map((color, i) => (
                      <div 
                        key={i} 
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-sacred-beige/70 group-hover:text-sacred-white transition-colors text-center truncate">
                    {theme.name}
                  </p>
                </button>
                <button
                  onClick={() => setThemeToDelete(theme)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Logo & Info */}
        <div className="space-y-6 bg-sacred-blue/40 border border-sacred-gold/10 rounded-lg p-6">
          <h3 className="text-lg font-serif text-sacred-gold mb-4 flex items-center gap-2">
            <Upload size={20} /> Logo & Nome
          </h3>
          
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 p-6 border border-dashed border-sacred-gold/30 rounded-lg bg-black/20">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo Preview" className="h-24 w-auto object-contain" />
              ) : (
                <div className="h-24 w-24 flex items-center justify-center text-sacred-gold/30 border border-dashed border-sacred-gold/20 rounded-lg">
                  <Palette size={40} />
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Upload size={16} className="mr-2" />
                Carregar Logo
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleLogoUpload}
              />
            </div>

            <Input 
              label="URL da Logo (ou use upload)"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />

            <Input 
              label="Nome do Projeto"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Nome do seu projeto"
            />
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-6 bg-sacred-blue/40 border border-sacred-gold/10 rounded-lg p-6">
          <h3 className="text-lg font-serif text-sacred-gold mb-4 flex items-center gap-2">
            {editingTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            Paleta de Cores ({editingTheme === 'dark' ? 'Escuro' : 'Claro'})
          </h3>

          <div className="space-y-4">
            {colorFields.map(({ key, label, description }) => (
              <div key={key} className="flex items-center gap-4 p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                <input 
                  type="color" 
                  value={currentColors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-12 h-12 rounded-lg border-2 border-sacred-gold/20 cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sacred-white font-medium">{label}</span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ backgroundColor: currentColors[key], color: key === 'blue' || key === 'gray' ? '#fff' : '#000' }}
                    >
                      {currentColors[key]}
                    </span>
                  </div>
                  <p className="text-xs text-sacred-beige/50">{description}</p>
                </div>
                <input 
                  type="text"
                  value={currentColors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-24 px-2 py-1 text-sm bg-sacred-blue/50 border border-sacred-gold/20 rounded text-sacred-white font-mono"
                  placeholder="#000000"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-sacred-blue/40 border border-sacred-gold/10 rounded-lg p-6">
        <h3 className="text-lg font-serif text-sacred-gold mb-4 flex items-center gap-2">
          <Eye size={20} /> Pré-visualização ({editingTheme === 'dark' ? 'Tema Escuro' : 'Tema Claro'})
        </h3>
        <div 
          className="rounded-lg p-6 border"
          style={{ 
            backgroundColor: currentColors.blue, 
            borderColor: currentColors.gray 
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 w-auto" />}
            <h4 style={{ color: currentColors.white }} className="font-serif text-lg">
              {projectName || 'Nome do Projeto'}
            </h4>
          </div>
          <p style={{ color: currentColors.beige }} className="text-sm mb-4">
            Este é um texto secundário com a cor bege selecionada.
          </p>
          <div className="flex gap-3">
            <button 
              style={{ 
                backgroundColor: currentColors.gold, 
                color: currentColors.blue 
              }}
              className="px-4 py-2 rounded-md font-semibold text-sm"
            >
              Botão Principal
            </button>
            <button 
              style={{ 
                borderColor: currentColors.gold, 
                color: currentColors.gold,
                backgroundColor: 'transparent'
              }}
              className="px-4 py-2 rounded-md font-semibold text-sm border"
            >
              Botão Secundário
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-sacred-gold/10">
        <Button onClick={handleSave} disabled={loading} size="lg">
          {loading ? <RefreshCw className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
          Salvar Alterações
        </Button>
      </div>

      {/* Save Theme Modal */}
      {showSaveThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl text-sacred-white">Salvar Tema Personalizado</h3>
              <button 
                onClick={() => setShowSaveThemeModal(false)}
                className="text-sacred-beige/50 hover:text-sacred-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sacred-beige/70 text-sm mb-4">
                Salve as cores do tema {editingTheme === 'dark' ? 'escuro' : 'claro'} atual como um tema reutilizável.
              </p>
              
              <div className="flex gap-2 mb-4 justify-center p-3 bg-black/20 rounded-lg">
                {Object.values(currentColors).map((color, i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <Input
                label="Nome do Tema"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Ex: Meu Tema Escuro"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowSaveThemeModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveAsTheme} className="flex-1">
                <Save size={16} className="mr-2" />
                Salvar Tema
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Theme Confirmation Modal */}
      {themeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 border-2 border-red-500/50">
                <Trash2 size={28} className="text-red-400" />
              </div>
              <h3 className="font-serif text-xl text-sacred-white mb-2">Excluir Tema?</h3>
              <p className="text-sacred-beige/70 text-sm">
                Tem certeza que deseja excluir o tema "{themeToDelete.name}"? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setThemeToDelete(null)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={() => handleDeleteTheme(themeToDelete)} 
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash2 size={16} className="mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
