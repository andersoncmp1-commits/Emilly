import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { CourseGrid } from '../components/CourseCard';

import { UserModuleViewer } from '../components/UserModuleViewer';

interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  position: number;
  progress?: number; // Mocked for now
  image_url?: string;
  release_date?: string;
  is_locked?: boolean;
}

export function Dashboard() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  useEffect(() => {
    const fetchModules = async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('position');
      
      if (error) {
        console.error('Error fetching modules:', error);
      } else {
        // Add mock progress for now
        const modulesWithProgress = data?.map(m => ({
          ...m,
          progress: Math.floor(Math.random() * 100)
        })) || [];
        setModules(modulesWithProgress);
      }
      setLoading(false);
    };

    fetchModules();
  }, []);

  return (
    <Layout>
      <div className="space-y-8">
        {activeModule ? (
           <UserModuleViewer 
              module={activeModule} 
              onBack={() => setActiveModule(null)} 
           />
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl md:text-4xl text-sacred-white mb-2">Meus Módulos</h2>
                <p className="text-sacred-beige/70">Acompanhe seu progresso na jornada formativa.</p>
              </div>
              
              {/* Resumo de Progresso Geral */}

            </div>

            {loading ? (
              <div className="text-sacred-gold text-center py-12">Carregando módulos...</div>
            ) : (
              <CourseGrid courses={modules.map((module, index) => {
                const isDateLocked = module.release_date ? new Date(module.release_date) > new Date() : false;
                const isLocked = module.is_locked || isDateLocked;
                return {
                  title: module.title,
                  description: module.description,
                  imageUrl: module.image_url || `https://images.unsplash.com/photo-${index % 2 === 0 ? '1516321318423-f06f85e504b3' : '1557804506-669a67965ba0'}?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80`,
                  isLocked: isLocked,
                  onClick: () => {
                     if (!isLocked) setActiveModule(module);
                  }
                };
              })} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
