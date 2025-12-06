import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, Edit2, Trash2, ChevronDown, ChevronRight, FileText, Video, Save, X } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
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

interface AdminModuleContentProps {
  module: any;
  onBack: () => void;
}

export const AdminModuleContent: React.FC<AdminModuleContentProps> = ({ module, onBack }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Editing States
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState({ title: '' });

  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null); // For creating new lesson in a specific section
  const [lessonForm, setLessonForm] = useState({
    title: '',
    type: 'text' as 'text' | 'video',
    content: '',
    video_url: ''
  });

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
    // Expand all by default
    setExpandedSections(new Set(fullSections.map(s => s.id)));
    setLoading(false);
  };

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedSections(newExpanded);
  };

  // --- SECTION HANDLERS ---
  const handleAddSection = () => {
    setEditingSection(null);
    setSectionForm({ title: '' });
    setIsSectionModalOpen(true);
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionForm({ title: section.title });
    setIsSectionModalOpen(true);
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá todas as aulas desta seção.')) return;
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (!error) fetchContent();
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSection) {
      await supabase.from('sections').update({ title: sectionForm.title }).eq('id', editingSection.id);
    } else {
      await supabase.from('sections').insert([{
        module_id: module.id,
        title: sectionForm.title,
        position: sections.length + 1
      }]);
    }
    setIsSectionModalOpen(false);
    fetchContent();
  };

  // --- LESSON HANDLERS ---
  const handleAddLesson = (sectionId: string) => {
    setEditingLesson(null);
    setActiveSectionId(sectionId);
    setLessonForm({ title: '', type: 'text', content: '', video_url: '' });
    setIsLessonModalOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setActiveSectionId(lesson.section_id);
    setLessonForm({
      title: lesson.title,
      type: lesson.type,
      content: lesson.content || '',
      video_url: lesson.video_url || ''
    });
    setIsLessonModalOpen(true);
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Excluir esta aula?')) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (!error) fetchContent();
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: lessonForm.title,
      type: lessonForm.type,
      content: lessonForm.content,
      video_url: lessonForm.video_url,
      section_id: activeSectionId
    };

    if (editingLesson) {
      await supabase.from('lessons').update(payload).eq('id', editingLesson.id);
    } else {
      // Get max position
      const currentSection = sections.find(s => s.id === activeSectionId);
      const position = (currentSection?.lessons.length || 0) + 1;
      await supabase.from('lessons').insert([{ ...payload, position }]);
    }
    setIsLessonModalOpen(false);
    fetchContent();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack} className="p-2 h-10 w-10 flex items-center justify-center">
          <ArrowLeft size={20} />
        </Button>
        <div>
           <div className="text-sacred-beige/60 text-sm">Gerenciando Conteúdo</div>
           <h2 className="text-2xl font-serif text-sacred-white">{module.title}</h2>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={handleAddSection} className="gap-2">
          <Plus size={18} /> Nova Seção
        </Button>
      </div>

      {/* Sections List */}
      <div className="space-y-4">
        {loading ? (
             <div className="text-center py-10 text-sacred-beige/50">Carregando conteúdo...</div>
        ) : sections.length === 0 ? (
             <div className="text-center py-10 text-sacred-beige/50 border border-dashed border-sacred-gold/20 rounded-xl">
                Este módulo ainda não tem conteúdo. Crie uma seção para começar.
             </div>
        ) : (
             sections.map(section => (
                <div key={section.id} className="bg-sacred-blue/30 border border-sacred-gold/10 rounded-xl overflow-hidden">
                   {/* Section Header */}
                   <div 
                     className="bg-sacred-blue/50 p-4 flex items-center justify-between cursor-pointer hover:bg-sacred-blue/60 transition-colors"
                     onClick={() => toggleSection(section.id)}
                   >
                      <div className="flex items-center gap-3">
                         <div className="text-sacred-gold">
                            {expandedSections.has(section.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                         </div>
                         <h3 className="font-serif text-lg text-sacred-white">{section.title}</h3>
                         <span className="text-xs text-sacred-beige/40">({section.lessons.length} aulas)</span>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                         <button onClick={() => handleEditSection(section)} className="p-2 text-sacred-beige hover:text-sacred-white hover:bg-white/5 rounded">
                            <Edit2 size={16} />
                         </button>
                         <button onClick={() => handleDeleteSection(section.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded">
                            <Trash2 size={16} />
                         </button>
                      </div>
                   </div>

                   {/* Lessons List */}
                   <AnimatePresence>
                     {expandedSections.has(section.id) && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="overflow-hidden"
                       >
                         <div className="p-4 space-y-2 bg-black/10">
                            {section.lessons.map(lesson => (
                               <div key={lesson.id} className="flex items-center justify-between p-3 bg-sacred-blue/40 border border-sacred-gold/5 rounded hover:border-sacred-gold/20 transition-all group">
                                  <div className="flex items-center gap-3">
                                     <div className={`p-2 rounded ${lesson.type === 'video' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                        {lesson.type === 'video' ? <Video size={16} /> : <FileText size={16} />}
                                     </div>
                                     <div>
                                        <p className="text-sacred-white text-sm font-medium">{lesson.title}</p>
                                        <p className="text-xs text-sacred-beige/40">
                                            {lesson.type === 'video' ? 'Vídeo Aula' : 'Texto / Artigo'}
                                        </p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => handleEditLesson(lesson)} className="p-1.5 text-sacred-beige hover:text-sacred-white hover:bg-white/10 rounded">
                                        <Edit2 size={14} />
                                     </button>
                                     <button onClick={() => handleDeleteLesson(lesson.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded">
                                        <Trash2 size={14} />
                                     </button>
                                  </div>
                               </div>
                            ))}
                            <Button 
                              variant="ghost" 
                              className="w-full mt-2 text-sm text-sacred-gold hover:text-sacred-gold/80 hover:bg-sacred-gold/5 border border-dashed border-sacred-gold/20"
                              onClick={() => handleAddLesson(section.id)}
                            >
                               <Plus size={14} className="mr-2" /> Adicionar Aula
                            </Button>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
             ))
        )}
      </div>

      {/* SECTION MODAL */}
      <AnimatePresence>
        {isSectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-md shadow-2xl"
            >
               <h3 className="text-xl font-serif text-sacred-white mb-4">
                  {editingSection ? 'Editar Seção' : 'Nova Seção'}
               </h3>
               <form onSubmit={handleSaveSection} className="space-y-4">
                 <Input 
                    label="Título da Seção"
                    value={sectionForm.title}
                    onChange={e => setSectionForm({...sectionForm, title: e.target.value})}
                    placeholder="Ex: Introdução"
                    required
                 />
                 <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsSectionModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LESSON MODAL */}
      <AnimatePresence>
        {isLessonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
            >
               <h3 className="text-xl font-serif text-sacred-white mb-4">
                  {editingLesson ? 'Editar Aula' : 'Nova Aula'}
               </h3>
               <form onSubmit={handleSaveLesson} className="space-y-4">
                 <Input 
                    label="Título da Aula"
                    value={lessonForm.title}
                    onChange={e => setLessonForm({...lessonForm, title: e.target.value})}
                    placeholder="Ex: Aula 1 - Conceitos"
                    required
                 />
                 
                 <div>
                    <label className="block text-sm font-medium text-sacred-beige mb-1">Tipo de Conteúdo</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="type" 
                              className="text-sacred-gold focus:ring-sacred-gold bg-transparent border-sacred-gold/30"
                              checked={lessonForm.type === 'text'}
                              onChange={() => setLessonForm({...lessonForm, type: 'text'})}
                            />
                            <span className="text-sacred-white">Texto / Artigo</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="type" 
                              className="text-sacred-gold focus:ring-sacred-gold bg-transparent border-sacred-gold/30"
                              checked={lessonForm.type === 'video'}
                              onChange={() => setLessonForm({...lessonForm, type: 'video'})}
                            />
                            <span className="text-sacred-white">Vídeo</span>
                        </label>
                    </div>
                 </div>

                 {lessonForm.type === 'video' && (
                    <Input 
                        label="URL do Vídeo (Youtube/Vimeo)"
                        value={lessonForm.video_url}
                        onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})}
                        placeholder="https://..."
                    />
                 )}

                 {lessonForm.type === 'text' && (
                    <div>
                        <label className="block text-sm font-medium text-sacred-beige mb-1">Conteúdo (HTML/Texto)</label>
                        <textarea 
                            className="w-full h-60 bg-sacred-blue/50 border border-sacred-gold/30 rounded-md p-3 text-sacred-white placeholder:text-sacred-beige/30 focus:outline-none focus:border-sacred-gold font-mono text-sm"
                            value={lessonForm.content}
                            onChange={e => setLessonForm({...lessonForm, content: e.target.value})}
                            placeholder="Escreva o conteúdo da aula aqui..."
                        />
                        <p className="text-xs text-sacred-beige/40 mt-1">Suporta tags HTML básicas (p, ul, li, strong, etc)</p>
                    </div>
                 )}

                 <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsLessonModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
