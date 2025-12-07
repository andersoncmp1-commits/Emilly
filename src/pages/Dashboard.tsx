import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { CourseCard } from '../components/CourseCard';
import { UserModuleViewer } from '../components/UserModuleViewer';
import { useNavigate } from 'react-router-dom';


interface HomeSection {
  id: string;
  title: string;
  position: number;
}

interface HomeItem {
  id: string;
  section_id: string;
  title: string;
  description: string;
  image_url: string;
  type: 'module' | 'link' | 'route';
  target_id?: string;
  target_url?: string;
  position: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  position: number;
  progress?: number;
  image_url?: string;
  release_date?: string;
  is_locked?: boolean;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [items, setItems] = useState<HomeItem[]>([]);
  const [fullModules, setFullModules] = useState<Module[]>([]); // To get module details like locked status
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetchData();
    getUserProfile();
  }, []);

  const getUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (data) {
            setUserName(data.full_name?.split(' ')[0].toUpperCase() || '');
        }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [sectionsRes, itemsRes, modulesRes] = await Promise.all([
      supabase.from('home_sections').select('*').order('position'),
      supabase.from('home_items').select('*').order('position'),
      supabase.from('modules').select('*')
    ]);

    if (sectionsRes.data) setSections(sectionsRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    if (modulesRes.data) setFullModules(modulesRes.data);
    setLoading(false);
  };

  const handleItemClick = (item: HomeItem) => {
    if (item.type === 'module' && item.target_id) {
        const moduleData = fullModules.find(m => m.id === item.target_id);
        if (moduleData) {
            // Check locked status
            const isDateLocked = moduleData.release_date ? new Date(moduleData.release_date) > new Date() : false;
            if (!moduleData.is_locked && !isDateLocked) {
                setActiveModule(moduleData);
            }
        }
    } else if (item.type === 'route' && item.target_url) {
        navigate(item.target_url);
    } else if (item.type === 'link' && item.target_url) {
        window.open(item.target_url, '_blank');
    }
  };

  const getItemLockedStatus = (item: HomeItem) => {
     if (item.type === 'module' && item.target_id) {
         const moduleData = fullModules.find(m => m.id === item.target_id);
         if (moduleData) {
             const isDateLocked = moduleData.release_date ? new Date(moduleData.release_date) > new Date() : false;
             return moduleData.is_locked || isDateLocked;
         }
     }
     return false;
  };

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        {activeModule ? (
           <UserModuleViewer 
              module={activeModule} 
              onBack={() => setActiveModule(null)} 
           />
        ) : (
          <>
            <div>
                 <h1 className="font-serif text-3xl md:text-4xl text-sacred-white">
                    BEM-VINDO{userName ? `, ${userName}` : ''}
                 </h1>
                 <p className="text-sacred-beige/60 mt-1">Continue sua jornada de aprendizado.</p>
            </div>

            {loading ? (
              <div className="text-sacred-gold text-center py-12">Carregando...</div>
            ) : sections.length === 0 ? (
                // Fallback if no sections configured
                <div className="text-center py-10">
                   <p className="text-sacred-beige/50">Nenhum conteúdo configurado na home.</p>
                   {/* Optionally, you could render the old grid here as fallback */}
                </div>
            ) : (
              sections.map(section => (
                <div key={section.id} className="space-y-4">
                   <h2 className="font-serif text-xl text-sacred-white uppercase tracking-wider pl-1 border-l-2 border-sacred-gold/50">{section.title}</h2>
                   
                   {/* Horizontal Scroll Container */}
                   <div className="relative group">
                       <div className="overflow-x-auto pb-4 scrollbar-hide snap-x flex gap-4 pr-4">
                           {items.filter(i => i.section_id === section.id).map((item) => (
                               <div key={item.id} className="min-w-[160px] w-[160px] md:min-w-[200px] md:w-[200px] snap-start">
                                   <CourseCard 
                                       title={item.title}
                                       imageUrl={item.image_url || 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=600&fit=crop'}
                                       description={item.description}
                                       isLocked={getItemLockedStatus(item)}
                                       onClick={() => handleItemClick(item)}
                                   />
                               </div>
                           ))}
                       </div>
                       
                       {/* Fade gradients for scroll indication (Optional) */}
                       <div className="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-sacred-blue to-transparent pointer-events-none md:hidden"/>
                   </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
