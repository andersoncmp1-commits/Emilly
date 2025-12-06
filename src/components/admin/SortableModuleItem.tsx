import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, Layers, Lock, Unlock, Image as ImageIcon, Calendar } from 'lucide-react';

export interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  position: number;
  image_url?: string;
  release_date?: string;
  is_locked?: boolean;
}

interface SortableModuleItemProps {
  module: Module;
  onEdit: (module: Module) => void;
  onDelete: (id: string) => void;
  onManageContent: (module: Module) => void;
}

export const SortableModuleItem: React.FC<SortableModuleItemProps> = ({ 
  module, 
  onEdit, 
  onDelete, 
  onManageContent 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const isLocked = module.is_locked || (module.release_date && new Date(module.release_date) > new Date());
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-sacred-blue/50 border border-sacred-gold/20 rounded-lg p-4 flex items-center gap-4 backdrop-blur-sm group hover:border-sacred-gold/40 transition-all ${
        isDragging ? 'opacity-50 shadow-xl border-sacred-gold' : ''
      }`}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="text-sacred-beige/40 hover:text-sacred-gold cursor-grab active:cursor-grabbing p-1"
      >
        <GripVertical size={20} />
      </div>

      {/* Thumbnail */}
      <div className="w-16 h-24 shrink-0 rounded bg-sacred-blue/80 overflow-hidden border border-sacred-gold/10 relative">
        {module.image_url ? (
          <img 
            src={module.image_url} 
            alt={module.title} 
            className={`w-full h-full object-cover ${isLocked ? 'grayscale brightness-50' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sacred-beige/30">
            <ImageIcon size={24} />
          </div>
        )}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock size={16} className="text-sacred-beige/80" />
          </div>
        )}
      </div>

      {/* Info - Clickable to Manage Content */}
      <div 
        className="flex-1 min-w-0 cursor-pointer group-hover:text-sacred-gold transition-colors"
        onClick={() => onManageContent(module)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
          <h3 className="font-serif text-lg text-sacred-white group-hover:text-sacred-gold transition-colors leading-tight">{module.title}</h3>
          <div className="flex-shrink-0">
            {isLocked ? (
              <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-sacred-blue text-sacred-beige/60 border border-sacred-gold/10 items-center gap-1 whitespace-nowrap w-fit">
                <Lock size={10} /> Bloqueado
              </span>
            ) : (
              <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 items-center gap-1 whitespace-nowrap w-fit">
                <Unlock size={10} /> Liberado
              </span>
            )}
          </div>
        </div>
        
        <p className="text-sm text-sacred-beige/60 line-clamp-1 mb-2">{module.description}</p>
        
        {module.release_date && (
          <div className="flex items-center gap-1 text-xs text-sacred-beige/40">
            <Calendar size={12} />
            Previsto para: {new Date(module.release_date).toLocaleDateString('pt-BR')}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
         {/* Manage Content Button */}
         <button 
          onClick={() => onManageContent(module)}
          className="p-2 text-sacred-gold hover:bg-sacred-gold/10 rounded transition-colors"
          title="Gerenciar Conteúdo"
        >
          <Layers size={18} />
        </button>

        <button 
          onClick={() => onEdit(module)}
          className="p-2 text-sacred-beige hover:text-sacred-white hover:bg-sacred-white/5 rounded transition-colors"
          title="Editar Informações"
        >
          <Edit2 size={18} />
        </button>
        
        <button 
          onClick={() => onDelete(module.id)}
          className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
          title="Excluir Módulo"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
