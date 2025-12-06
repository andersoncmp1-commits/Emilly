import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ChevronRight, ChevronDown, PlayCircle, FileText } from 'lucide-react';
import { Button } from './Button';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { motion, AnimatePresence } from 'framer-motion';

interface Lesson {
  id: string;
  section_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  type: 'text' | 'video';
  position: number;
}

interface Section {
  id: string;
  module_id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

interface UserModuleViewerProps {
  module: any;
  onBack: () => void;
}

export const UserModuleViewer: React.FC<UserModuleViewerProps> = ({ module, onBack }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContent();
  }, [module.id]);

  const fetchContent = async () => {
    setLoading(true);
    // Fetch sections
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('sections')
      .select('*')
      .eq('module_id', module.id)
      .order('position');

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
      setLoading(false);
      return;
    }

    if (!sectionsData) {
        setSections([]);
        setLoading(false);
        return;
    }

    // Fetch lessons for all sections
    const sectionIds = sectionsData.map(s => s.id);
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .in('section_id', sectionIds)
      .order('position');

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
    }

    // Combine
    const fullSections = sectionsData.map(section => ({
      ...section,
      lessons: lessonsData?.filter(l => l.section_id === section.id) || []
    }));

    setSections(fullSections);
    
    // Default open first section and select first lesson if available
    if (fullSections.length > 0) {
        setExpandedSections(new Set([fullSections[0].id]));
        if (fullSections[0].lessons.length > 0) {
            setActiveLesson(fullSections[0].lessons[0]);
        }
    }
    
    setLoading(false);
  };

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedSections(newExpanded);
  };

  const handleLessonSelect = (lesson: Lesson) => {
      setActiveLesson(lesson);
      // On mobile, scroll content into view
      if (window.innerWidth < 768 && contentRef.current) {
          setTimeout(() => {
              contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
      }
  };

  // Helper to extract video ID from URL (simple version for Youtube)
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }

    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    return url; 
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] bg-neutral-900 border border-sacred-gold/10 rounded-xl overflow-hidden mt-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sacred-gold/10 bg-sacred-blue/20 z-40 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
             <Button variant="outline" onClick={onBack} className="p-1 h-8 w-8 text-sacred-beige hover:text-sacred-gold shrink-0 border-0 bg-transparent hover:bg-white/5">
               <ArrowLeft size={20} />
             </Button>
             <h2 className="text-lg font-serif text-sacred-white truncate flex-1">{module.title}</h2>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden relative">
         {/* SIDEBAR - LESSON LIST */}
         <div className="
            w-full md:w-80 
            bg-neutral-900/50 md:bg-sacred-blue/5 border-b md:border-b-0 md:border-r border-sacred-gold/10 
            flex-shrink-0 
            md:overflow-y-auto
         ">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h3 className="text-sacred-gold text-xs uppercase tracking-wider font-bold">Conteúdo do Módulo</h3>
                    <span className="text-xs text-sacred-beige/40">{sections.reduce((acc, s) => acc + s.lessons.length, 0)} aulas</span>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-sacred-gold border-t-transparent"></div>
                    </div>
                ) : sections.length === 0 ? (
                    <div className="text-sacred-beige/40 text-sm italic text-center py-4">Nenhum conteúdo disponível.</div>
                ) : (
                    <div className="space-y-4">
                        {sections.map(section => (
                            <div key={section.id}>
                                <button 
                                    onClick={() => toggleSection(section.id)}
                                    className="flex items-center justify-between w-full text-left text-sm font-medium text-sacred-beige hover:text-sacred-white transition-colors mb-2 py-1"
                                >
                                    <span className="font-serif">{section.title}</span>
                                    {expandedSections.has(section.id) ? <ChevronDown size={14} className="text-sacred-gold" /> : <ChevronRight size={14} className="text-sacred-gold/50" />}
                                </button>
                                
                                <AnimatePresence>
                                    {expandedSections.has(section.id) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden pl-3 border-l-2 border-sacred-gold/10 space-y-1"
                                        >
                                            {section.lessons.map(lesson => (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => handleLessonSelect(lesson)}
                                                    className={`w-full text-left text-sm py-3 px-3 rounded-lg flex items-center gap-3 transition-all ${
                                                        activeLesson?.id === lesson.id 
                                                            ? 'bg-sacred-gold text-black font-semibold shadow-lg shadow-sacred-gold/10' 
                                                            : 'text-sacred-beige/70 hover:bg-white/5 hover:text-sacred-white'
                                                    }`}
                                                >
                                                    {lesson.type === 'video' ? <PlayCircle size={16} /> : <FileText size={16} />}
                                                    <span className="truncate leading-tight">{lesson.title}</span>
                                                </button>
                                            ))}
                                            {section.lessons.length === 0 && (
                                                <p className="text-xs text-sacred-beige/20 pl-2 py-2">Sem aulas nesta seção</p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                )}
            </div>
         </div>

         {/* MAIN CONTENT Area */}
         <div ref={contentRef} className="flex-1 md:overflow-y-auto bg-neutral-900 relative w-full pt-4 md:pt-0">
            {activeLesson ? (
                <div className="max-w-3xl mx-auto p-5 md:p-10 pb-20">
                    <div className="mb-6 md:mb-10 border-b border-sacred-gold/10 pb-6">
                        <span className="text-sacred-gold text-xs uppercase tracking-wider mb-2 block font-medium">
                            {sections.find(s => s.id === activeLesson.section_id)?.title}
                        </span>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif text-sacred-white leading-tight">
                            {activeLesson.title}
                        </h1>
                    </div>

                    {/* Content Renderer */}
                    <div className="space-y-6 md:space-y-8">
                        {activeLesson.type === 'video' && activeLesson.video_url && (
                             <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl border border-sacred-gold/10 bg-black">
                                <iframe 
                                    src={getEmbedUrl(activeLesson.video_url)} 
                                    className="w-full h-full" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                ></iframe>
                             </div>
                        )}

                        {activeLesson.content && (
                            <div 
                                className="prose prose-invert prose-gold max-w-none 
                                prose-headings:font-serif prose-headings:font-normal
                                prose-h3:text-xl md:prose-h3:text-2xl prose-h3:text-sacred-gold prose-h3:mt-8 prose-h3:mb-4
                                prose-p:text-sacred-beige/90 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base md:prose-p:text-lg
                                prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-2 prose-li:text-sacred-beige/90
                                prose-blockquote:border-l-4 prose-blockquote:border-sacred-gold prose-blockquote:bg-sacred-gold/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:my-6
                                prose-strong:text-sacred-white prose-strong:font-bold
                                "
                                dangerouslySetInnerHTML={{ __html: activeLesson.content }}
                            />
                        )}

                        {/* PWA Install Prompt for 'Comece Aqui' module */}
                        {module.title === 'Comece Aqui' && (
                           <PWAInstallPrompt />
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-sacred-beige/30 p-8 text-center">
                    {module.title === 'Comece Aqui' ? (
                        <div className="w-full max-w-2xl">
                           <PWAInstallPrompt />
                        </div>
                    ) : (
                        <>
                           <FileText size={48} className="mb-4 opacity-50" />
                           <p className="text-lg">Selecione uma aula no menu para começar.</p>
                        </>
                    )}
                </div>
            )}
         </div>
      </div>
    </div>
  );
};
