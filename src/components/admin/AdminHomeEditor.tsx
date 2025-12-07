import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../Button';
import { Input } from '../Input';
import { Plus, Edit2, Trash2, Image, Link as LinkIcon, Box, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  image_url?: string;
}

interface AdminHomeEditorProps {
  onEditModuleContent?: (moduleId: string) => void;
  onManageModules?: () => void;
  modules?: Module[];
}

export const AdminHomeEditor: React.FC<AdminHomeEditorProps> = ({ onEditModuleContent, onManageModules, modules: propModules }) => {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [items, setItems] = useState<HomeItem[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    if (propModules) {
        setModules(propModules);
    } else {
        // Fallback if needed, but usually propModules is sufficient if parent provides it
    }
  }, [propModules]);
  const [loading, setLoading] = useState(true);

  // Section Modal
  const [editingSection, setEditingSection] = useState<HomeSection | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');

  // Item Modal
  const [editingItem, setEditingItem] = useState<HomeItem | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    image_url: '',
    type: 'link' as 'module' | 'link' | 'route',
    target_id: '',
    target_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [sectionsRes, itemsRes, modulesRes] = await Promise.all([
      supabase.from('home_sections').select('*').order('position'),
      supabase.from('home_items').select('*').order('position'),
      supabase.from('modules').select('id, title, image_url')
    ]);

    if (sectionsRes.data) setSections(sectionsRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    if (modulesRes.data) {
        if (!propModules) setModules(modulesRes.data);
    }
    setLoading(false);
  };

  // --- SECTION ACTIONS ---
  const handleAddSection = () => {
    setEditingSection(null);
    setSectionTitle('');
    setIsSectionModalOpen(true);
  };

  const handleEditSection = (section: HomeSection) => {
    setEditingSection(section);
    setSectionTitle(section.title);
    setIsSectionModalOpen(true);
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Tem certeza? Isso apagará todos os itens desta seção.')) return;
    await supabase.from('home_sections').delete().eq('id', id);
    fetchData();
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSection) {
      await supabase.from('home_sections').update({ title: sectionTitle }).eq('id', editingSection.id);
    } else {
      await supabase.from('home_sections').insert([{ 
        title: sectionTitle, 
        position: sections.length 
      }]);
    }
    setIsSectionModalOpen(false);
    fetchData();
  };

  const moveSection = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    // Update local state for optimistic UI
    setSections(newSections);

    // Update DB
    for (let i = 0; i < newSections.length; i++) {
        await supabase.from('home_sections').update({ position: i }).eq('id', newSections[i].id);
    }
  };


  // --- ITEM ACTIONS ---
  const handleAddItem = (sectionId: string) => {
    setEditingItem(null);
    setActiveSectionId(sectionId);
    setItemForm({
      title: '',
      description: '',
      image_url: '',
      type: 'link',
      target_id: '',
      target_url: ''
    });
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: HomeItem) => {
    setEditingItem(item);
    setActiveSectionId(item.section_id);
    setItemForm({
      title: item.title,
      description: item.description || '',
      image_url: item.image_url || '',
      type: item.type,
      target_id: item.target_id || '',
      target_url: item.target_url || ''
    });
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Excluir este item?')) return;
    await supabase.from('home_items').delete().eq('id', id);
    fetchData();
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      section_id: activeSectionId,
      title: itemForm.title,
      description: itemForm.description,
      image_url: itemForm.image_url,
      type: itemForm.type,
      target_id: itemForm.type === 'module' ? itemForm.target_id : null,
      target_url: itemForm.type !== 'module' ? itemForm.target_url : null,
    };

    if (editingItem) {
      await supabase.from('home_items').update(payload).eq('id', editingItem.id);
    } else {
        // Find max position in this section
        const sectionItems = items.filter(i => i.section_id === activeSectionId);
        const position = sectionItems.length;
        await supabase.from('home_items').insert([{ ...payload, position }]);
    }
    setIsItemModalOpen(false);
    fetchData();
  };

  const handleOrganizeLayout = async () => {
    if (!confirm('Isso irá criar as seções "Instruções", "Cursos" e "Doações" e organizar os módulos conforme solicitado. Deseja continuar?')) return;
    setLoading(true);

    try {
        // 1. Ensure Sections
        const sectionsToEnsure = ['Instruções', 'Cursos', 'Doações'];
        const sectionMap = new Map<string, string>();

        for (let i = 0; i < sectionsToEnsure.length; i++) {
            const title = sectionsToEnsure[i];
            // Fix: Check matches more carefully or create duplicate if titles match? 
            // We assume unique titles for simplicity here, picking the first one found.
            const { data: existing } = await supabase.from('home_sections').select('id').eq('title', title).maybeSingle();
            
            if (!existing) {
                const { data: newSec } = await supabase.from('home_sections').insert([{ title, position: i }]).select('id').single();
                if (newSec) sectionMap.set(title, newSec.id);
            } else {
                sectionMap.set(title, existing.id);
            }
        }

        // 2. Find/Create Modules
        const getModuleId = async (titlePart: string, exactTitle?: string, icon?: string, locked?: boolean) => {
             const { data: existing } = await supabase.from('modules').select('id').ilike('title', `%${titlePart}%`).limit(1).maybeSingle();
             if (existing) return existing.id;
             
             if (exactTitle) {
                 const { data: newMod } = await supabase.from('modules').insert([{
                    title: exactTitle,
                    description: 'Gerado automaticamente',
                    icon: icon || 'BookOpen',
                    is_locked: locked || false,
                    position: 999
                 }]).select('id').single();
                 return newMod?.id;
             }
             return null;
        };

        const modComece = await getModuleId('Comece Aqui');
        const modPortar = await getModuleId('Como se portar');
        const modSilencio = await getModuleId('Silêncio');
        const modCursos = await getModuleId('Cursos (Em Breve)', 'Cursos (Em Breve)', 'Clock', true);
        const modDoar = await getModuleId('Doar', 'Doar', 'Heart', false);

        // 3. Insert Items
        const addItem = async (secTitle: string, title: string, modId: string | null, pos: number) => {
            const secId = sectionMap.get(secTitle);
            if (!secId || !modId) return;
            
            // Remove existing item link to this module in this section to prevent duplicates
            await supabase.from('home_items').delete().eq('section_id', secId).eq('target_id', modId);

            await supabase.from('home_items').insert([{
                section_id: secId,
                title: title,
                type: 'module',
                target_id: modId,
                position: pos,
                image_url: '' // Optional: fetch from module if needed
            }]);
        };

        if (modComece) await addItem('Instruções', 'Comece Aqui', modComece, 0);
        if (modPortar) await addItem('Instruções', 'Como se portar na igreja', modPortar, 1);
        if (modSilencio) await addItem('Instruções', 'Silêncio na missa e na igreja', modSilencio, 2);
        
        await addItem('Cursos', 'Cursos (Em Breve)', modCursos, 0);
        await addItem('Doações', 'Doar', modDoar, 0);

        alert('Layout organizado com sucesso!');
        fetchData();

    } catch (e) {
        console.error(e);
        alert('Erro ao organizar layout. Verifique o console.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif text-sacred-white">Editor da Home</h3>
        <div className="flex gap-2">
            <Button onClick={handleOrganizeLayout} variant="outline" className="gap-2 border-sacred-gold/30 text-sacred-gold">
                <Box size={18} /> Organizar Layout
            </Button>
            <Button onClick={handleAddSection} className="gap-2">
                <Plus size={18} /> Nova Seção
            </Button>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
            <div className="text-center py-10 text-sacred-beige/50">Carregando...</div>
        ) : sections.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-sacred-gold/20 rounded-xl text-sacred-beige/50">
                Nenhuma seção na home. Crie uma para começar.
            </div>
        ) : (
            sections.map((section, index) => (
                <div key={section.id} className="bg-sacred-blue/30 border border-sacred-gold/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-4 border-b border-sacred-gold/5 pb-2">
                        <div className="flex items-center gap-3">
                             <div className="flex flex-col gap-1">
                                <button 
                                    onClick={() => moveSection(index, 'up')} 
                                    disabled={index === 0}
                                    className="text-sacred-gold/50 hover:text-sacred-gold disabled:opacity-20"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button 
                                    onClick={() => moveSection(index, 'down')}
                                    disabled={index === sections.length - 1}
                                    className="text-sacred-gold/50 hover:text-sacred-gold disabled:opacity-20"
                                >
                                    <ArrowDown size={14} />
                                </button>
                             </div>
                             <h4 className="text-lg font-serif text-sacred-white">{section.title}</h4>
                        </div>
                        <div className="flex gap-2">
                            {onManageModules && (
                                <button 
                                  onClick={onManageModules}
                                  className="p-2 text-sacred-gold/70 hover:bg-sacred-gold/10 rounded flex items-center gap-2 text-xs border border-sacred-gold/20 mr-2"
                                  title="Gerenciar Módulos"
                                >
                                    <Box size={14} />
                                    <span className="hidden md:inline">Módulos</span>
                                </button>
                            )}
                            <button onClick={() => handleEditSection(section)} className="p-2 text-sacred-beige hover:bg-white/5 rounded">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteSection(section.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.filter(i => i.section_id === section.id).map(item => (
                            <div key={item.id} className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-lg p-3 relative group">
                                <div className="aspect-video w-full bg-black/20 rounded mb-2 overflow-hidden relative">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sacred-gold/20">
                                            <Image size={24} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                        {item.type === 'module' && item.target_id && onEditModuleContent && (
                                            <button 
                                              onClick={() => onEditModuleContent(item.target_id!)}
                                              className="p-2 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/30"
                                              title="Editar Conteúdo do Módulo"
                                            >
                                                <Box size={16} />
                                            </button>
                                        )}
                                        <button onClick={() => handleEditItem(item)} className="p-2 bg-sacred-gold/10 text-sacred-gold rounded-full hover:bg-sacred-gold/20">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    {item.type === 'module' ? <Box size={12} className="text-blue-400" /> : <LinkIcon size={12} className="text-green-400" />}
                                    <p className="text-sacred-white text-sm font-medium truncate" title={item.title}>{item.title}</p>
                                </div>
                                <p className="text-xs text-sacred-beige/50 truncate">{item.description || 'Sem descrição'}</p>
                            </div>
                        ))}
                        <button 
                            onClick={() => handleAddItem(section.id)}
                            className="bg-transparent border border-dashed border-sacred-gold/20 rounded-lg p-3 flex flex-col items-center justify-center gap-2 text-sacred-beige/50 hover:text-sacred-gold hover:border-sacred-gold/50 transition-all min-h-[150px]"
                        >
                            <Plus size={24} />
                            <span className="text-sm">Adicionar Item</span>
                        </button>
                    </div>
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
                     value={sectionTitle}
                     onChange={e => setSectionTitle(e.target.value)}
                     placeholder="Ex: Ferramentas de Estudo"
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

      {/* ITEM MODAL */}
      <AnimatePresence>
        {isItemModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
             >
                {/* Modal Header */}
                <h3 className="text-xl font-serif text-sacred-white mb-4">
                   {editingItem ? 'Editar Item' : 'Novo Item'}
                </h3>
                <form onSubmit={handleSaveItem} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                         label="Título"
                         value={itemForm.title}
                         onChange={e => setItemForm({...itemForm, title: e.target.value})}
                         placeholder="Ex: Flash Cards"
                         required
                      />
                      <div className="flex flex-col gap-1">
                         <label className="text-sm font-medium text-sacred-beige">Tipo</label>
                         <select 
                            className="bg-sacred-blue/50 border border-sacred-gold/30 rounded-md p-2 text-sacred-white focus:outline-none focus:border-sacred-gold"
                            value={itemForm.type}
                            onChange={e => setItemForm({...itemForm, type: e.target.value as any})}
                         >
                            <option value="link">Link Externo</option>
                            <option value="route">Rota Interna</option>
                            <option value="module">Módulo do Curso</option>
                         </select>
                      </div>
                  </div>

                  <Input 
                      label="Descrição (Opcional)"
                      value={itemForm.description}
                      onChange={e => setItemForm({...itemForm, description: e.target.value})}
                  />

                  <Input 
                      label="URL da Imagem"
                      value={itemForm.image_url}
                      onChange={e => setItemForm({...itemForm, image_url: e.target.value})}
                      placeholder="https://..."
                  />

                  {itemForm.type === 'module' ? (
                     <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-sacred-beige">Selecione o Módulo</label>
                        <select 
                           className="bg-sacred-blue/50 border border-sacred-gold/30 rounded-md p-2 text-sacred-white focus:outline-none focus:border-sacred-gold"
                           value={itemForm.target_id}
                           onChange={e => {
                               const selectedModule = modules.find(m => m.id === e.target.value);
                               setItemForm({
                                   ...itemForm, 
                                   target_id: e.target.value,
                                   title: itemForm.title || selectedModule?.title || '',
                                   image_url: itemForm.image_url || selectedModule?.image_url || ''
                               });
                           }}
                        >
                           <option value="">Selecione...</option>
                           {modules.map(m => (
                               <option key={m.id} value={m.id}>{m.title}</option>
                           ))}
                        </select>
                     </div>
                  ) : (
                     <Input 
                        label={itemForm.type === 'route' ? "Caminho da Rota (Ex: /cronograma)" : "URL de Destino"}
                        value={itemForm.target_url}
                        onChange={e => setItemForm({...itemForm, target_url: e.target.value})}
                        placeholder={itemForm.type === 'route' ? "/minha-rota" : "https://google.com"}
                     />
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                     <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)}>Cancelar</Button>
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
