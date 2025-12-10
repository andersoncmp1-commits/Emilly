import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface ColorsType {
  blue: string;
  gold: string;
  beige: string;
  white: string;
  gray: string;
}

interface AppSettings {
  id: string;
  project_name: string;
  logo_url: string;
  colors: ColorsType; // Current active colors (for backwards compatibility)
  colors_dark?: ColorsType;
  colors_light?: ColorsType;
}

// Default theme presets
export const DEFAULT_DARK_THEME: ColorsType = {
  blue: '#0F0C0B',
  gold: '#C5A059',
  beige: '#E6DCC3',
  white: '#FAF9F6',
  gray: '#2C2420',
};

export const DEFAULT_LIGHT_THEME: ColorsType = {
  blue: '#FAF9F6',
  gold: '#B8963F',
  beige: '#5C4D3C',
  white: '#1A1612',
  gray: '#E8E2D9',
};

interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  isDarkMode: boolean;
  darkTheme: ColorsType;
  lightTheme: ColorsType;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  updateDarkTheme: (colors: ColorsType) => Promise<void>;
  updateLightTheme: (colors: ColorsType) => Promise<void>;
  toggleTheme: () => void;
  applyTheme: (isDark: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Convert HEX color to RGB values string (e.g., "#FF0000" -> "255 0 0")
function hexToRgb(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    return saved ? saved === 'dark' : true;
  });

  // Custom themes (stored in localStorage for now, can be moved to DB)
  const [darkTheme, setDarkTheme] = useState<ColorsType>(() => {
    const saved = localStorage.getItem('customDarkTheme');
    return saved ? JSON.parse(saved) : DEFAULT_DARK_THEME;
  });

  const [lightTheme, setLightTheme] = useState<ColorsType>(() => {
    const saved = localStorage.getItem('customLightTheme');
    return saved ? JSON.parse(saved) : DEFAULT_LIGHT_THEME;
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  // Apply appropriate theme when mode changes
  useEffect(() => {
    const colors = isDarkMode ? darkTheme : lightTheme;
    applyColors(colors);
    localStorage.setItem('themeMode', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, darkTheme, lightTheme]);

  const fetchSettings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (fetchError) {
        console.warn('Could not fetch settings, using defaults:', fetchError.message);
        applyColors(isDarkMode ? darkTheme : lightTheme);
        return;
      }

      if (data) {
        setSettings(data);
        
        // Load custom themes from DB if available
        if (data.colors_dark) {
          setDarkTheme(data.colors_dark);
          localStorage.setItem('customDarkTheme', JSON.stringify(data.colors_dark));
        }
        if (data.colors_light) {
          setLightTheme(data.colors_light);
          localStorage.setItem('customLightTheme', JSON.stringify(data.colors_light));
        }
        
        // Apply current theme
        const currentColors = isDarkMode 
          ? (data.colors_dark || darkTheme) 
          : (data.colors_light || lightTheme);
        applyColors(currentColors);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      applyColors(isDarkMode ? darkTheme : lightTheme);
    } finally {
      setLoading(false);
    }
  };

  const applyColors = (colors: ColorsType) => {
    const root = document.documentElement;
    if (!colors) return;
    
    root.style.setProperty('--color-sacred-blue', hexToRgb(colors.blue));
    root.style.setProperty('--color-sacred-gold', hexToRgb(colors.gold));
    root.style.setProperty('--color-sacred-beige', hexToRgb(colors.beige));
    root.style.setProperty('--color-sacred-white', hexToRgb(colors.white));
    root.style.setProperty('--color-sacred-gray', hexToRgb(colors.gray));
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const applyTheme = (isDark: boolean) => {
    setIsDarkMode(isDark);
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!settings) return;
    
    const { error } = await supabase
      .from('app_settings')
      .update(newSettings)
      .eq('id', settings.id);

    if (error) {
      console.error('Error updating settings:', error);
      throw error;
    }

    setSettings(prev => prev ? { ...prev, ...newSettings } : null);
  };

  const updateDarkTheme = async (colors: ColorsType) => {
    setDarkTheme(colors);
    localStorage.setItem('customDarkTheme', JSON.stringify(colors));
    
    // Apply if currently in dark mode
    if (isDarkMode) {
      applyColors(colors);
    }

    // Save to DB if settings exist
    if (settings) {
      try {
        await supabase
          .from('app_settings')
          .update({ colors_dark: colors, colors: isDarkMode ? colors : lightTheme })
          .eq('id', settings.id);
      } catch (err) {
        console.error('Error saving dark theme:', err);
      }
    }
  };

  const updateLightTheme = async (colors: ColorsType) => {
    setLightTheme(colors);
    localStorage.setItem('customLightTheme', JSON.stringify(colors));
    
    // Apply if currently in light mode
    if (!isDarkMode) {
      applyColors(colors);
    }

    // Save to DB if settings exist
    if (settings) {
      try {
        await supabase
          .from('app_settings')
          .update({ colors_light: colors, colors: isDarkMode ? darkTheme : colors })
          .eq('id', settings.id);
      } catch (err) {
        console.error('Error saving light theme:', err);
      }
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      loading, 
      isDarkMode,
      darkTheme,
      lightTheme,
      updateSettings, 
      updateDarkTheme,
      updateLightTheme,
      toggleTheme,
      applyTheme
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
