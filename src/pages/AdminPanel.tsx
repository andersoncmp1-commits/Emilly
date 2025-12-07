import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Plus, Edit2, Trash2, Save, X, Users, Shield, Search, ChevronLeft, ChevronRight, Upload, Calendar, DollarSign, QrCode, Share2, Send, Wallet, Clock, Smartphone, AlertCircle, RefreshCw, Play, PauseCircle, LayoutDashboard, BookOpen, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uazapi } from '../lib/uazapi';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableModuleItem, type Module } from '../components/admin/SortableModuleItem';
import { AdminModuleContent } from '../components/admin/AdminModuleContent';
import { AdminHomeEditor } from '../components/admin/AdminHomeEditor';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  phone?: string;
  payment_status?: 'Em dia' | 'Em atraso';
  monthly_value?: number;
}

interface Campaign {
  id: string;
  title: string;
  current_amount: number;
  goal_amount: number;
  status: 'active' | 'ended';
}

interface ScheduledMessage {
  id: string;
  campaign_id: string;
  message_content: string;
  trigger_type: 'date' | 'amount_reached' | 'amount_remaining';
  trigger_value: string;
  status: 'pending' | 'sent' | 'failed';
  scheduled_at?: string;
  created_at: string;
  min_delay?: number;
  max_delay?: number;
  batch_size?: number;
  batch_interval?: number;
  campaigns?: Campaign;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'processing';
  created_at: string;
}

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'home' | 'modules' | 'users' | 'campaigns' | 'financial' | 'whatsapp'>('financial');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Module State
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isModuleListOpen, setIsModuleListOpen] = useState(false);
  const [moduleFormData, setModuleFormData] = useState<Partial<Module>>({
    title: '',
    description: '',
    icon: 'BookOpen',
    position: 0,
    image_url: '',
    release_date: '',
    is_locked: false
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && over) {
      setModules((items) => {
        // Update positions in DB
        if (activeHomeSectionId) {
             // We are reordering home_items in a section
             // 1. Get the current ordered list of modules displayed
             const sectionHomeItems = homeItems.filter(hi => hi.section_id === activeHomeSectionId).sort((a,b) => a.position - b.position);
             const currentModuleIds = sectionHomeItems.map(hi => hi.target_id);

             // 2. Determine old and new index based on module IDs
             const oldIndex = currentModuleIds.indexOf(active.id as string);
             const newIndex = currentModuleIds.indexOf(over.id as string);

             if (oldIndex !== -1 && newIndex !== -1) {
                // 3. Move in the homeItems array
                const newSectionHomeItems = arrayMove(sectionHomeItems, oldIndex, newIndex);

                // 4. Update the main homeItems state
                const updatedHomeItems = homeItems.map(hi => {
                    const found = newSectionHomeItems.find(n => n.id === hi.id);
                    if (found) {
                        return { ...hi, position: newSectionHomeItems.indexOf(found) };
                    }
                    return hi;
                });
                setHomeItems(updatedHomeItems);

                // 5. Persist to DB
                // We only need to update the items that changed position
                 const updates = newSectionHomeItems.map((item, index) => ({
                    id: item.id,
                    section_id: item.section_id,
                    title: item.title,
                    description: item.description,
                    image_url: item.image_url,
                    type: item.type,
                    target_id: item.target_id,
                    target_url: item.target_url,
                    position: index
                 }));
                 supabase.from('home_items').upsert(updates).then(({ error }) => {
                    if (error) console.error('Error reordering home items in modal:', error);
                 });
             }
             // For the visual list in modal (which is derived from modules), we don't strictly update 'modules' state order
             // because the modal list derivation logic will use 'homeItems' order.
             // However, setModules is expectation of dnd-kit for optimistic UI if we were rendering 'modules'.
             // Since we derive the view from 'homeItems', updating 'homeItems' above is crucial.
             return items; // Return items unchanged to setModules because we handle state separately for homeItems

        } else {
             // Global module reordering
             const oldIndex = items.findIndex((item) => item.id === active.id);
             const newIndex = items.findIndex((item) => item.id === over.id);
             const newItems = arrayMove(items, oldIndex, newIndex);

             const updates = newItems.map((item, index) => ({
               id: item.id,
               position: index
             }));
             supabase.from('modules').upsert(updates).then(({ error }) => {
               if (error) console.error('Error updating positions:', error);
             });
             return newItems;
        }
      });
    }
  };

  // Module Content State
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  // User State
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    full_name: '',
    role: 'user' as 'user' | 'admin',
    phone: '',
    payment_status: 'Em dia' as 'Em dia' | 'Em atraso',
    monthly_value: 0
  });

  // Campaign State
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignFormData, setCampaignFormData] = useState({
    title: '',
    goal_amount: 0,
    current_amount: 0,
    status: 'active' as 'active' | 'ended'
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  // Scheduled Messages State
  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    campaign: null as Campaign | null,
    messages: [] as ScheduledMessage[],
    loading: false
  });
  
  const [messageForm, setMessageForm] = useState({
    content: '',
    trigger_type: 'date' as 'date' | 'amount_reached' | 'amount_remaining',
    trigger_value: '',
    scheduled_at: '',
    min_delay: 30,
    max_delay: 120,
    batch_size: 10,
    batch_interval: 300
  });

  // Home Section & Home Items State (for section-specific module management)
  const [activeHomeSectionId, setActiveHomeSectionId] = useState<string | null>(null);
  const [homeItems, setHomeItems] = useState<any[]>([]);

  // Broadcast State
  const [broadcastModal, setBroadcastModal] = useState({
    isOpen: false,
    campaign: null as Campaign | null,
    message: '',
    isSending: false,
    progress: 0,
    total: 0
  });

  // Uazapi Campaigns Monitor
  const [monitorModal, setMonitorModal] = useState(false);
  const [uazapiCampaigns, setUazapiCampaigns] = useState<any[]>([]);

  // WhatsApp Connection State
  const [connectionInfo, setConnectionInfo] = useState({
    status: 'loading', // connected, disconnected, connecting, error, unauthorized
    qrcode: '',
    number: '',
    name: ''
  });

  // Custom Alert State
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success'
  });

  const showAlert = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Polling for Scheduled Messages
  const processScheduledMessages = async () => {
    // Only run if there are active campaigns to check against
    const { data: messages, error } = await supabase
      .from('campaign_messages')
      .select('*, campaigns(*)')
      .eq('status', 'pending');

    if (error || !messages || messages.length === 0) return;

    for (const msg of messages) {
      const campaign = msg.campaigns;
      if (!campaign) continue;

      let shouldSend = false;

      if (msg.trigger_type === 'date' && msg.scheduled_at) {
        if (new Date(msg.scheduled_at) <= new Date()) {
          shouldSend = true;
        }
      } else if (msg.trigger_type === 'amount_reached') {
        if (campaign.current_amount >= Number(msg.trigger_value)) {
          shouldSend = true;
        }
      } else if (msg.trigger_type === 'amount_remaining') {
        const remaining = campaign.goal_amount - campaign.current_amount;
        if (remaining <= Number(msg.trigger_value)) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        console.log(`Disparando mensagem programada: ${msg.id}`);
        
        // Mark as sent first (or processing) to avoid double send in next poll
        await supabase.from('campaign_messages').update({ status: 'sent', processed_at: new Date().toISOString() }).eq('id', msg.id);

        // Fetch valid phones
        const { data: profiles } = await supabase.from('profiles').select('phone').not('phone', 'is', null);
        const phones = profiles?.map(p => p.phone).filter(p => p && p.length > 8) as string[] || [];

        if (phones.length > 0) {
           uazapi.createCampaign(phones, msg.message_content, {
             minDelay: msg.min_delay,
             maxDelay: msg.max_delay,
             batchSize: msg.batch_size,
             batchInterval: msg.batch_interval,
             info: `Auto:${campaign.title} - ${msg.trigger_type}`
           }).then(res => {
             if (res.success) {
               console.log(`Campanha criada via Uazapi para msg ${msg.id}. Batches: ${res.campaigns?.length}`);
             } else {
               console.error(`Falha ao criar campanha Uazapi para msg ${msg.id}: ${res.error}`);
               // Optionally revert status to 'pending' or 'failed' if needed, but for now we log
             }
           });
        }
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(processScheduledMessages, 60000); // Check every minute
    // Initial check
    setTimeout(processScheduledMessages, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData(); // Always fetch data when switching tabs (replaces logic from Step 69 overwriting) 
    
    let intervalId: any;

    if (activeTab === 'whatsapp') {
      handleCheckConnection(); // Initial check
      // Automatically poll every 3 seconds to check if QR code was scanned
      intervalId = setInterval(() => {
        handleCheckConnection(true);
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab]);

  // Message Handlers
  const handleOpenMessageModal = async (campaign: Campaign) => {
    try {
      const status = await uazapi.getStatus();
      
      if (status.status !== 'connected') {
          showAlert(
            'WhatsApp Desconectado', 
            'A instância do WhatsApp está desconectada. Por favor, vá até a aba "Conexão WhatsApp" e escaneie o QR Code para conectar.',
            'error'
          );
          return;
      }
    } catch (e) {
      console.error('Error in handleOpenMessageModal:', e);
      showAlert('Erro', 'Erro ao verificar conexão. Veja o console.', 'error');
      return;
    }

    setMessageModal(prev => ({ ...prev, isOpen: true, campaign, loading: true }));
    const { data } = await supabase.from('campaign_messages').select('*').eq('campaign_id', campaign.id).order('created_at', { ascending: false });
    setMessageModal(prev => ({ ...prev, messages: data || [], loading: false }));
    setMessageForm({ 
      content: '', 
      trigger_type: 'date', 
      trigger_value: '', 
      scheduled_at: '',
      min_delay: 30,
      max_delay: 120,
      batch_size: 10,
      batch_interval: 300
    });
  };

  const handleSaveMessage = async () => {
    if (!messageModal.campaign) return;
    
    // Validation
    if (!messageForm.content) return alert('Digite a mensagem');
    if (messageForm.trigger_type === 'date' && !messageForm.scheduled_at) return alert('Selecione a data');
    if (messageForm.trigger_type !== 'date' && !messageForm.trigger_value) return alert('Digite o valor');

    const payload = {
      campaign_id: messageModal.campaign.id,
      message_content: messageForm.content,
      trigger_type: messageForm.trigger_type,
      trigger_value: messageForm.trigger_type === 'date' ? messageForm.scheduled_at : messageForm.trigger_value,
      scheduled_at: messageForm.trigger_type === 'date' ? new Date(messageForm.scheduled_at).toISOString() : null,
      min_delay: messageForm.min_delay,
      max_delay: messageForm.max_delay,
      batch_size: messageForm.batch_size,
      batch_interval: messageForm.batch_interval,
      status: 'pending'
    };

    const { error } = await supabase.from('campaign_messages').insert([payload]);
    if (error) {
      alert('Erro ao salvar agendamento');
      console.error(error);
    } else {
      // Refresh list
      const { data } = await supabase.from('campaign_messages').select('*').eq('campaign_id', messageModal.campaign.id).order('created_at', { ascending: false });
      setMessageModal(prev => ({ ...prev, messages: data || [] }));
      setMessageForm({ 
        content: '', 
        trigger_type: 'date', 
        trigger_value: '', 
        scheduled_at: '',
        min_delay: 30,
        max_delay: 120,
        batch_size: 10,
        batch_interval: 300
      });
      alert('Agendamento salvo!');
    }
  };

  // --- Uazapi Monitor Handlers ---
  const handleOpenMonitor = async () => {
    setMonitorModal(true);
    await fetchUazapiCampaigns();
  };

  const fetchUazapiCampaigns = async () => {
    setLoading(true);
    const data = await uazapi.listCampaigns();
    setUazapiCampaigns(data || []);
    setLoading(false);
  };

  const handleControlCampaign = async (folderId: string, action: 'stop' | 'continue' | 'delete') => {
    const success = await uazapi.controlCampaign(folderId, action);
    if (success) {
      await fetchUazapiCampaigns(); // Refresh list
    } else {
      alert('Falha ao executar ação na campanha.');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if(!confirm('Excluir agendamento?')) return;
    await supabase.from('campaign_messages').delete().eq('id', id);
    setMessageModal(prev => ({ 
      ...prev, 
      messages: prev.messages.filter(m => m.id !== id) 
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    // Always fetch users for dashboard stats
    const { data: usersData, error: usersError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersError) console.error('Error fetching users:', usersError);
    else setUsers(usersData || []);

    if (activeTab === 'modules') {
      const { data, error } = await supabase.from('modules').select('*').order('position');
      if (error) console.error('Error fetching modules:', error);
      else setModules(data || []);
    }
    
    // Always fetch home items for filtering modules by section
    const { data: homeItemsData } = await supabase.from('home_items').select('*');
    if (homeItemsData) setHomeItems(homeItemsData);

    if (activeTab === 'campaigns' || activeTab === 'dashboard') {
      const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (error) console.error('Error fetching campaigns:', error);
      else setCampaigns(data || []);
    }
    if (activeTab === 'financial') {
      const { data, error } = await supabase.from('financial_transactions').select('*').order('created_at', { ascending: false });
      if (error) console.error('Error fetching transactions:', error);
      else setTransactions(data || []);
    }
    setLoading(false);
  };

  const handleDeleteCampaign = (id: string) => {
    setDeleteConfirmation({ isOpen: true, id });
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteConfirmation.id) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', deleteConfirmation.id);
    if (error) {
      console.error('Error deleting campaign:', error);
      alert('Erro ao excluir campanha');
    } else {
      fetchData();
    }
    setDeleteConfirmation({ isOpen: false, id: null });
  };

  // --- Campaign Handlers ---
  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setCampaignFormData({
      title: campaign.title,
      goal_amount: campaign.goal_amount,
      current_amount: campaign.current_amount,
      status: campaign.status
    });
    setIsCampaignModalOpen(true);
  };

  const handleAddNewCampaign = () => {
    setEditingCampaign(null);
    setCampaignFormData({
      title: '',
      goal_amount: 0,
      current_amount: 0,
      status: 'active'
    });
    setIsCampaignModalOpen(true);
  };

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    let error;
    if (editingCampaign) {
      const { error: updateError } = await supabase.from('campaigns').update(campaignFormData).eq('id', editingCampaign.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('campaigns').insert([campaignFormData]);
      error = insertError;
    }
    if (error) {
      console.error('Error saving campaign:', error);
      alert('Erro ao salvar campanha');
    } else {
      setIsCampaignModalOpen(false);
      fetchData();
    }
  };

  // --- Broadcast Handlers ---
  const handleOpenBroadcast = async (campaign: Campaign) => {
    try {
      const status = await uazapi.getStatus();
      
      if (status.status !== 'connected') {
          showAlert(
            'WhatsApp Desconectado', 
            'A instância do WhatsApp está desconectada. Por favor, vá até a aba "Conexão WhatsApp" e escaneie o QR Code para conectar.',
            'error'
          );
          return;
      }
    } catch (e) {
      console.error('Error in handleOpenBroadcast:', e);
      showAlert('Erro', 'Erro ao verificar conexão. Veja o console.', 'error');
      return;
    }

    setBroadcastModal({
      isOpen: true,
      campaign,
      message: `Olá! Participe da nossa campanha: ${campaign.title}. Contribua agora e ajude nossa comunidade!`,
      isSending: false,
      progress: 0,
      total: 0
    });
  };

  const handleSendBroadcast = async () => {
    if (!broadcastModal.campaign) return;

    // Check Connection BEFORE sending
    try {
      const status = await uazapi.getStatus();
      if (status.status !== 'connected') {
         showAlert(
            'WhatsApp Desconectado', 
            'A instância do WhatsApp está desconectada. Por favor, vá até a aba "Conexão WhatsApp" e escaneie o QR Code para conectar.',
            'error'
         );
         return;
      }
    } catch (e) {
      console.error('Error checking status in handleSendBroadcast:', e);
      showAlert('Erro', 'Erro ao verificar status de conexão.', 'error');
      return;
    }

    setBroadcastModal(prev => ({ ...prev, isSending: true }));
    const phones = users.filter(u => u.phone && u.phone.length > 8).map(u => u.phone as string);
    if (phones.length === 0) {
      alert('Nenhum usuário com telefone cadastrado encontrado.');
      setBroadcastModal(prev => ({ ...prev, isSending: false }));
      return;
    }
    setBroadcastModal(prev => ({ ...prev, total: phones.length }));
    const { successCount } = await uazapi.broadcast(phones, broadcastModal.message, (current, total) => {
        setBroadcastModal(prev => ({ ...prev, progress: current, total }));
    });
    alert(`Mensagens enviadas!\nSucesso: ${successCount}\nTotal: ${phones.length}`);
    setBroadcastModal(prev => ({ ...prev, isOpen: false, isSending: false }));
  };

  // --- Module Handlers ---
  const confirmDeleteModule = (id: string) => {
    setDeleteConfirmation({ isOpen: true, id });
  };

  const executeDeleteModule = async () => {
    if (!deleteConfirmation.id) return;
    const id = deleteConfirmation.id;

    console.log('Executing module deletion for id:', id);
    
    // 1. Delete associated home_items first (FK constraint)
    const { error: fkError } = await supabase.from('home_items').delete().eq('target_id', id).eq('type', 'module');
    if (fkError) console.error('Error removing home shortcuts for module:', fkError);

    // 2. Delete the module
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) {
        console.error('Error deleting module:', error);
        showAlert('Erro', 'Erro ao excluir módulo: ' + error.message, 'error');
    } else {
        fetchData();
        showAlert('Sucesso', 'Módulo excluído com sucesso!', 'success');
    }
    setDeleteConfirmation({ isOpen: false, id: null });
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleFormData({
      title: module.title,
      description: module.description,
      icon: module.icon,
      position: module.position,
      image_url: module.image_url || '',
      release_date: module.release_date || '',
      is_locked: module.is_locked || false
    });
    setIsModuleModalOpen(true);
  };

  const handleAddNewModule = () => {
    setEditingModule(null);
    setModuleFormData({
      title: '',
      description: '',
      icon: 'BookOpen',
      position: modules.length + 1,
      image_url: '',
      release_date: '',
      is_locked: false
    });
    setIsModuleModalOpen(true);
  };

  const handleSubmitModule = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...moduleFormData,
      release_date: moduleFormData.release_date === '' ? null : moduleFormData.release_date,
      image_url: moduleFormData.image_url === '' ? null : moduleFormData.image_url,
    };
    if (editingModule) {
      const { error } = await supabase.from('modules').update(payload).eq('id', editingModule.id);
      if (error) alert('Erro ao atualizar módulo');
    } else {
      const { data, error } = await supabase.from('modules').insert([payload]).select(); // Select to get ID
      if (error) {
        alert('Erro ao criar módulo');
        console.error(error);
      } else if (activeHomeSectionId && data && data[0]) {
        // If created within a specific section context, link it immediately
        const newModuleId = data[0].id;
        // Determine position
        const sectionItems = homeItems.filter(i => i.section_id === activeHomeSectionId);
        // Find the minimum position to insert at the beginning, or default to 0
        const minPos = sectionItems.length > 0 ? Math.min(...sectionItems.map(i => i.position)) : 0;
        const nextPos = minPos - 1;
        
        const { error: linkError } = await supabase.from('home_items').insert([{
           section_id: activeHomeSectionId,
           type: 'module',
           target_id: newModuleId,
           position: nextPos,
           title: payload.title, // Copy basic info
           description: payload.description,
           image_url: payload.image_url
        }]);

        if (linkError) console.error('Error linking new module to section:', linkError);
        else {
           // Refresh home items locally or trigger a fetch
           // fetchData will be called below anyway
        }
      }
    }
    setIsModuleModalOpen(false);
    fetchData();
  };

  // --- WhatsApp Handlers ---
  const handleCheckConnection = async (silent?: boolean | any) => {
    const isSilent = silent === true; // Only if explicitly true, helps avoid Event object issues
    if (!isSilent) setConnectionInfo(prev => ({ ...prev, status: 'loading' }));
    
    const info = await uazapi.getStatus();
    
    if (info.status === 'unauthorized') {
      setConnectionInfo(prev => ({ ...prev, status: 'unauthorized', name: '', number: '', qrcode: '' }));
    } else {
      setConnectionInfo(prev => ({
        ...prev,
        status: info.status || 'disconnected',
        qrcode: info.qrcode || '',
        number: info.number || '',
        name: info.name || ''
      }));
    }
  };

  const handleCreateInstance = async () => {
    console.log('Iniciando criação de instância automática (Corredentora)...');
    setConnectionInfo(prev => ({ ...prev, status: 'loading' }));
    
    try {
      let result = await uazapi.createInstance("Corredentora");
      console.log('Resultado createInstance (Tentativa 1):', result);

      if (!result.success && (result.error?.includes('Unauthorized') || result.error?.includes('401'))) {
         const newAdminToken = prompt("O Admin Token salvo parece inválido/expirado.\n\nPor favor, insira um NOVO ADMIN TOKEN (da sua conta Uazapi/CodeChat) para criar a instância:");
         if (newAdminToken) {
            console.log('Tentando criar com Admin Token fornecido manualmente...');
            result = await uazapi.createInstance("Corredentora", newAdminToken);
         }
      }
      
      if (result.success && result.token) {
        console.log('TOKEN CRIADO:', result.token);
        prompt("Instância CRIADA! Copie o Token abaixo e atualize o .env (VITE_UAZAPI_TOKEN):", result.token);
        alert("Instância recriada! Atualize seu .env com o novo token.");
        handleCheckConnection();
      } else {
        alert('Erro ao criar instância: ' + (result.error || 'Erro desconhecido'));
        handleCheckConnection(); 
      }
    } catch (e) {
      console.error('Erro fatal:', e);
      alert('Erro fatal: ' + e);
      handleCheckConnection();
    }
  };

  const handleDisconnect = async () => {
    console.log('Iniciando desconexão...');
    try {
      const success = await uazapi.disconnect();
      if (success) {
        alert('Desconectado com sucesso!');
        handleCheckConnection();
      } else {
        alert('Erro ao desconectar.');
      }
    } catch (e) {
      alert('Exceção ao desconectar: ' + e);
    }
  };

  const handleTriggerConnect = async () => {
    setConnectionInfo(prev => ({ ...prev, status: 'loading' }));
    await uazapi.connect();
    setTimeout(() => handleCheckConnection(), 2000);
  };

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      handleCheckConnection();
    }
  }, [activeTab]);

  // --- User Handlers ---
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert('Erro ao excluir usuário');
    else fetchData();
  };

  const handleEditUser = (user: Profile) => {
    setEditingUser(user);
    setUserFormData({
      full_name: user.full_name || '',
      role: user.role,
      phone: user.phone || '',
      payment_status: user.payment_status || 'Em dia',
      monthly_value: user.monthly_value || 0
    });
    setIsUserModalOpen(true);
  };

  const handleAddNewUser = () => {
    setEditingUser(null);
    setUserFormData({
      full_name: '',
      role: 'user',
      phone: '',
      payment_status: 'Em dia',
      monthly_value: 0
    });
    setIsUserModalOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const { error } = await supabase.from('profiles').update(userFormData).eq('id', editingUser.id);
      if (error) alert('Erro ao atualizar usuário');
    } else {
      // Create new profile - Note: This presumes profiles can be created without auth.users link or RLS allows it
      // If profiles.id is FK to auth.users, this might fail without creating auth user first.
      // Assuming simple CRM usage for now based on request.
      const { error } = await supabase.from('profiles').insert([userFormData]);
      if (error) {
        console.error('Error creating user:', error);
        alert('Erro ao criar usuário. Verifique se o telefone é único ou contate o suporte.');
      }
    }
    setIsUserModalOpen(false);
    fetchData();
  };

  // Filtered Users
  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Dashboard Stats
  const totalContribution = users.reduce((acc, user) => acc + (user.monthly_value || 0), 0);
  const totalContributors = users.length;

  return (
    <Layout>
      <div className="space-y-8 pb-24 md:pb-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <button 
              onClick={() => window.location.href = '/dashboard'} 
              className="flex items-center gap-2 text-sacred-beige/60 hover:text-sacred-gold transition-colors text-sm mb-4"
            >
              <ChevronLeft size={16} />
              Voltar para o Dashboard
            </button>
            <h2 className="font-serif text-3xl text-sacred-white mb-2">Painel Administrativo</h2>
            <p className="text-sacred-beige/70">Gerencie o sistema.</p>
          </div>
          
          <div className="hidden md:block w-full overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-6 min-w-max border-b border-sacred-gold/10 px-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  activeTab === 'dashboard' 
                    ? 'text-sacred-gold text-base' 
                    : 'text-sacred-beige/60 hover:text-sacred-beige'
                }`}
              >
                Dashboard
                {activeTab === 'dashboard' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('modules')}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  activeTab === 'modules' 
                    ? 'text-sacred-gold text-base' 
                    : 'text-sacred-beige/60 hover:text-sacred-beige'
                }`}
              >
                Home / Módulos
                {activeTab === 'modules' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  activeTab === 'users' 
                    ? 'text-sacred-gold text-base' 
                    : 'text-sacred-beige/60 hover:text-sacred-beige'
                }`}
              >
                Base de Fiéis
                {activeTab === 'users' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  activeTab === 'campaigns' 
                    ? 'text-sacred-gold text-base' 
                    : 'text-sacred-beige/60 hover:text-sacred-beige'
                }`}
              >
                Campanhas
                {activeTab === 'campaigns' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  activeTab === 'whatsapp' 
                    ? 'text-sacred-gold text-base' 
                    : 'text-sacred-beige/60 hover:text-sacred-beige'
                }`}
              >
                Conexão WhatsApp
                {activeTab === 'whatsapp' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  activeTab === 'financial' 
                    ? 'text-sacred-gold text-base' 
                    : 'text-sacred-beige/60 hover:text-sacred-beige'
                }`}
              >
                Financeiro
                {activeTab === 'financial' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-sacred-gold text-center py-8">Carregando...</div>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Header & Filter */}
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-2xl text-sacred-white">Visão Geral</h3>
                  <Button variant="outline" className="gap-2 text-sm">
                    <Calendar size={16} />
                    Filtrar por data
                  </Button>
                </div>

                {/* Top Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Contribuição */}
                  <div className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-xl p-6 flex items-center gap-4 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-lg bg-sacred-gold/10 flex items-center justify-center text-sacred-gold">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-sacred-beige/60">Contribuição</p>
                      <p className="text-2xl font-serif text-sacred-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalContribution)}
                      </p>
                    </div>
                  </div>

                  {/* Contribuintes */}
                  <div className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-xl p-6 flex items-center gap-4 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-lg bg-sacred-gold/10 flex items-center justify-center text-sacred-gold">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-sacred-beige/60">Contribuintes</p>
                      <p className="text-2xl font-serif text-sacred-white">{totalContributors}</p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-xl p-6 flex items-center gap-4 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-lg bg-sacred-gold/10 flex items-center justify-center text-sacred-gold">
                      <QrCode size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-sacred-beige/60">QR Code</p>
                      <button className="text-sm text-sacred-gold hover:underline flex items-center gap-1">
                        Compartilhar Código <Share2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Middle Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Chart - Arrecadação por Campanha */}
                  <div className="lg:col-span-2 bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm">
                    <h4 className="text-lg font-serif text-sacred-white mb-6">Arrecadação por Campanha</h4>
                    <div className="h-64 w-full flex items-end justify-start gap-4 px-2 overflow-x-auto">
                      {campaigns.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-sacred-beige/40">
                          Nenhuma campanha ativa
                        </div>
                      ) : (
                        campaigns.map((campaign, i) => {
                          const maxAmount = Math.max(...campaigns.map(c => c.current_amount), 100); // Avoid div by zero
                          const heightPercentage = Math.max((campaign.current_amount / maxAmount) * 100, 5); // Min 5% height
                          
                          return (
                            <div key={campaign.id} className="w-16 min-w-[4rem] h-full flex flex-col items-center gap-2 group relative">
                              {/* Tooltip */}
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-sacred-blue border border-sacred-gold/20 px-2 py-1 rounded text-xs text-sacred-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(campaign.current_amount)}
                              </div>
                              
                              <div className="w-full bg-sacred-gold/10 rounded-t-sm relative flex-1 flex items-end">
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: `${heightPercentage}%` }}
                                  transition={{ duration: 1, delay: i * 0.1 }}
                                  className="w-full bg-gradient-to-t from-sacred-gold/20 to-sacred-gold/60 rounded-t-sm relative"
                                >
                                </motion.div>
                              </div>
                              <div className="text-[10px] text-sacred-beige/40 text-center truncate w-full" title={campaign.title}>
                                {campaign.title.split(' ')[0]}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Side Chart - Doação por Campanha */}
                  <div className="bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm">
                    <h4 className="text-lg font-serif text-sacred-white mb-6">Doação por Campanha</h4>
                    <div className="space-y-4">
                      {campaigns.length === 0 ? (
                        <div className="text-sacred-beige/40 text-sm text-center py-4">
                          Nenhuma campanha ativa
                        </div>
                      ) : (
                        campaigns
                          .sort((a, b) => b.current_amount - a.current_amount)
                          .slice(0, 5)
                          .map((campaign, i) => {
                            const maxVal = Math.max(...campaigns.map(c => c.current_amount), 100);
                            const widthPercentage = (campaign.current_amount / maxVal) * 100;
                            const colors = ['bg-orange-300', 'bg-green-300', 'bg-blue-300', 'bg-red-300', 'bg-yellow-300'];
                            const color = colors[i % colors.length];

                            return (
                              <div key={campaign.id} className="flex items-center gap-2 text-sm">
                                <span className="w-24 text-sacred-beige/70 truncate" title={campaign.title}>
                                  {campaign.title}
                                </span>
                                <div className="flex-1 h-2 bg-sacred-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${widthPercentage}%` }}
                                    className={`h-full ${color} opacity-80`}
                                  />
                                </div>
                                <span className="w-20 text-right text-sacred-beige/90">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(campaign.current_amount)}
                                </span>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Contribuição por faixa de valor */}
                  <div className="bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm">
                    <h4 className="text-lg font-serif text-sacred-white mb-6">Contribuição por faixa de valor</h4>
                    <div className="h-48 flex items-end justify-around gap-4">
                      {[
                        { label: '1 a 25', val: 12071, h: 60 },
                        { label: '25 a 50', val: 14420, h: 75 },
                        { label: '50 a 100', val: 10520, h: 50 },
                        { label: '100 +', val: 15601, h: 85 },
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 w-full">
                          <span className="text-xs text-sacred-beige/60">R$ {item.val.toLocaleString()}</span>
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${item.h}%` }}
                            className="w-16 bg-sacred-gold/40 rounded-t-md"
                          />
                          <span className="text-xs text-sacred-beige/40">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contribuição por idade */}
                  <div className="bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm">
                    <h4 className="text-lg font-serif text-sacred-white mb-6">Contribuição por idade</h4>
                    <div className="space-y-3">
                      {[
                        { label: '81 anos +', m: 40, f: 30 },
                        { label: '70 a 80', m: 60, f: 50 },
                        { label: '51 a 61', m: 55, f: 45 },
                        { label: '31 a 50', m: 70, f: 60 },
                        { label: '21 a 30', m: 65, f: 55 },
                        { label: '15 a 20', m: 30, f: 40 },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="flex-1 flex justify-end">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${item.f}%` }}
                              className="h-2 bg-orange-300/70 rounded-l-full"
                            />
                          </div>
                          <span className="w-16 text-center text-sacred-beige/50">{item.label}</span>
                          <div className="flex-1 flex justify-start">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${item.m}%` }}
                              className="h-2 bg-blue-400/70 rounded-r-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center gap-6 mt-6 text-xs text-sacred-beige/60">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-300/70" /> Feminino
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400/70" /> Masculino
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Quote */}
                <div className="text-center py-8 text-sacred-beige/40 text-sm italic font-serif">
                  "Cria em mim, ó Deus, um coração puro, e renova em mim um espírito reto." Salmos 51:10 🙏
                </div>
              </div>
            )}

            {/* MODULES / HOME EDITOR TAB */}
            {activeTab === 'modules' && (
              activeModule ? (
                <AdminModuleContent 
                   module={activeModule} 
                   onBack={() => setActiveModule(null)} 
                />
              ) : (
                <div className="space-y-4">

                  <AdminHomeEditor 
                    modules={modules}
                    onManageModules={(sectionId) => {
                       setActiveHomeSectionId(sectionId || null);
                       setIsModuleListOpen(true);
                    }}
                    onEditModuleContent={(moduleId) => {
                      const m = modules.find(mod => mod.id === moduleId);
                      if (m) setActiveModule(m);
                    }}
                  />
                  
                  {/* Hidden DND Context to prevent errors if hooks are still running or if we want to restore legacy list below */}
                  {/* Keeping legacy list hidden for safe keeping or just removing it entirely. Removing it is cleaner. */}
                </div>
              )
            )}

            {/* CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="font-serif text-2xl text-sacred-white">Campanhas</h3>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={handleOpenMonitor} className="gap-2 justify-center w-full sm:w-auto">
                       <RefreshCw size={16} />
                       Monitorar Disparos
                    </Button>
                    <Button onClick={handleAddNewCampaign} className="gap-2 justify-center w-full sm:w-auto">
                      <Plus size={20} />
                      Nova campanha
                    </Button>
                  </div>
                </div>

                {/* Active Campaigns */}
                <div className="space-y-4">
                  <h4 className="font-serif text-lg text-sacred-white">Ativas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.filter(c => c.status === 'active').map(campaign => (
                      <div key={campaign.id} className="bg-sacred-blue/40 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-4">
                          <h5 className="font-serif text-lg text-sacred-white font-medium">{campaign.title}</h5>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleEditCampaign(campaign)}
                              className="text-sacred-gold hover:text-sacred-white transition-colors p-1"
                              title="Editar campanha"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              title="Excluir campanha"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-sacred-white font-medium">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(campaign.current_amount)}
                          </span>
                          <span className="text-sacred-beige/70">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(campaign.goal_amount)}
                          </span>
                        </div>

                        <div className="h-2 bg-sacred-gold/10 rounded-full overflow-hidden mb-6">
                          <div 
                            className="h-full bg-sacred-gold rounded-full"
                            style={{ width: `${Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100)}%` }}
                          />
                        </div>

                        <Button 
                          variant="outline" 
                          className="w-full gap-2 text-sm"
                          onClick={() => handleOpenBroadcast(campaign)}
                        >
                          <Send size={14} />
                          Enviar mensagem (WhatsApp)
                        </Button>

                        <Button 
                          variant="outline"
                          className="w-full gap-2 text-sm mt-2"
                          onClick={() => handleOpenMessageModal(campaign)}
                        >
                          <Clock size={14} />
                          Programar Mensagens
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ended Campaigns */}
                <div className="space-y-4">
                  <h4 className="font-serif text-lg text-sacred-white/60">Encerradas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.filter(c => c.status === 'ended').map(campaign => (
                      <div key={campaign.id} className="bg-sacred-blue/20 border border-sacred-gold/10 rounded-xl p-6 opacity-70">
                        <div className="flex justify-between items-start mb-4">
                          <h5 className="font-serif text-lg text-sacred-beige/60">{campaign.title}</h5>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleEditCampaign(campaign)}
                              className="text-sacred-gold hover:text-sacred-white transition-colors p-1"
                              title="Editar campanha"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              title="Excluir campanha"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-sacred-beige/50">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(campaign.current_amount)}
                          </span>
                          <span className="text-sacred-beige/40 text-xs uppercase tracking-wider mt-0.5">
                            Encerrada
                          </span>
                        </div>

                        <div className="h-2 bg-sacred-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-sacred-beige/20 rounded-full"
                            style={{ width: `${Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}


            {/* FINANCIAL TAB */}
            {activeTab === 'financial' && (
              <div className="space-y-8">
                <h3 className="font-serif text-2xl text-sacred-white">Financeiro</h3>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Saldo Total */}
                  <div className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-lg bg-sacred-gold/10 flex items-center justify-center text-sacred-gold mb-4">
                      <Wallet size={20} />
                    </div>
                    <div className="flex items-center gap-2 text-sacred-beige/60 text-sm mb-1">
                      Saldo total <div className="w-4 h-4 rounded-full border border-sacred-beige/30 flex items-center justify-center text-[10px]">i</div>
                    </div>
                    <p className="text-2xl font-serif text-sacred-white">R$ 52.613,80</p>
                  </div>

                  {/* Saldo Pendente */}
                  <div className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-lg bg-sacred-gold/10 flex items-center justify-center text-sacred-gold mb-4">
                      <Clock size={20} />
                    </div>
                    <div className="flex items-center gap-2 text-sacred-beige/60 text-sm mb-1">
                      Saldo pendente <div className="w-4 h-4 rounded-full border border-sacred-beige/30 flex items-center justify-center text-[10px]">i</div>
                    </div>
                    <p className="text-2xl font-serif text-sacred-white">R$ 20.785,84</p>
                  </div>

                  {/* Saldo Disponível */}
                  <div className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-sacred-gold/10 flex items-center justify-center text-sacred-gold mb-4">
                        <DollarSign size={20} />
                      </div>
                      <div className="flex items-center gap-2 text-sacred-beige/60 text-sm mb-1">
                        Saldo disponível <div className="w-4 h-4 rounded-full border border-sacred-beige/30 flex items-center justify-center text-[10px]">i</div>
                      </div>
                      <p className="text-2xl font-serif text-sacred-white">R$ 31.827,96</p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button className="text-xs py-1.5 px-3 h-auto">
                        Solicitar saque
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Statement Table */}
                <div className="bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl overflow-hidden backdrop-blur-sm">
                  <div className="p-6 border-b border-sacred-gold/10">
                    <h4 className="font-serif text-lg text-sacred-white">Extrato</h4>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-sacred-blue/40 text-sacred-beige/60 text-xs uppercase tracking-wider font-medium">
                          <th className="p-4 font-normal">Nome</th>
                          <th className="p-4 font-normal">Data</th>
                          <th className="p-4 font-normal">Status</th>
                          <th className="p-4 font-normal text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sacred-gold/5">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-sacred-white/5 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  tx.type === 'debit' ? 'bg-green-500/10 text-green-400' : 'bg-sacred-gold/10 text-sacred-gold'
                                }`}>
                                  {tx.type === 'debit' ? <DollarSign size={14} /> : <Users size={14} />}
                                </div>
                                <span className="font-medium text-sacred-white">{tx.description}</span>
                              </div>
                            </td>
                            <td className="p-4 text-sacred-beige/80 text-sm">
                              {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                                tx.status === 'processing' 
                                  ? 'bg-blue-500/20 text-blue-200' 
                                  : tx.status === 'completed'
                                    ? 'bg-green-500/20 text-green-200'
                                    : 'bg-yellow-500/20 text-yellow-200'
                              }`}>
                                {tx.status === 'processing' ? 'Em processamento' : tx.status === 'completed' ? 'Finalizado' : 'Pendente'}
                              </span>
                            </td>
                            <td className={`p-4 text-right font-medium ${
                              tx.type === 'debit' ? 'text-sacred-beige/60' : 'text-sacred-beige/90'
                            }`}>
                              {tx.type === 'debit' ? '- ' : '+ '}
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination (Mock) */}
                  <div className="p-4 border-t border-sacred-gold/10 flex items-center justify-between text-sm text-sacred-beige/60">
                    <button className="flex items-center gap-1 hover:text-sacred-gold disabled:opacity-50">
                      <ChevronLeft size={16} />
                      Anterior
                    </button>
                    
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded flex items-center justify-center bg-sacred-gold text-sacred-blue font-bold">1</button>
                      <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-sacred-white/10">2</button>
                      <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-sacred-white/10">3</button>
                      <span className="flex items-center justify-center">...</span>
                      <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-sacred-white/10">15</button>
                    </div>

                    <button className="flex items-center gap-1 hover:text-sacred-gold">
                      Próximo
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* WHATSAPP CONNECTION TAB */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-2xl text-sacred-white flex items-center gap-2">
                       <Smartphone className="text-sacred-gold" /> Conexão WhatsApp
                    </h3>
                    <p className="text-sacred-beige/60">Gerencie a conexão da instância para envio de mensagens.</p>
                  </div>
                  <Button variant="outline" onClick={() => handleCheckConnection()} className="gap-2">
                    <RefreshCw size={16} /> Atualizar Status
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Status Card */}
                  <div className="bg-sacred-blue/40 border border-sacred-gold/20 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-6 backdrop-blur-sm min-h-[400px]">
                    
                    {connectionInfo.status === 'loading' && (
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sacred-gold"></div>
                    )}

                    {connectionInfo.status === 'connected' && (
                      <>
                        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                          <Smartphone size={40} className="text-green-400" />
                        </div>
                        <div>
                          <h4 className="text-2xl font-serif text-sacred-white mb-2">Conectado</h4>
                          <p className="text-sacred-beige/70">Pronto para enviar mensagens</p>
                        </div>
                        <div className="bg-sacred-blue/60 p-4 rounded-lg border border-sacred-gold/10 w-full text-left">
                          <p className="text-xs text-sacred-gold uppercase tracking-wider mb-1">Nome da Instância</p>
                          <p className="text-sacred-white font-medium mb-3">{connectionInfo.name || 'Instância Principal'}</p>
                          <p className="text-xs text-sacred-gold uppercase tracking-wider mb-1">Número Conectado</p>
                          <p className="text-sacred-white font-medium">{connectionInfo.number || 'Carregando...'}</p>
                        </div>
                        <div className="flex gap-4 w-full">
                          <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={handleDisconnect}>
                             Desconectar
                          </Button>
                        </div>
                      </>
                    )}

                    {(connectionInfo.status === 'disconnected' || connectionInfo.status === 'connecting') && (
                      <>
                        {connectionInfo.qrcode && connectionInfo.qrcode.startsWith('data:image') ? (
                          <div className="bg-white p-4 rounded-lg shadow-lg">
                            <img src={connectionInfo.qrcode} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
                          </div>
                        ) : (
                          <div className="w-24 h-24 bg-sacred-gold/10 rounded-full flex items-center justify-center border-2 border-sacred-gold/30">
                            <QrCode size={40} className="text-sacred-gold" />
                          </div>
                        )}
                        
                        <div>
                          <h4 className="text-2xl font-serif text-sacred-white mb-2">
                            {connectionInfo.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                          </h4>
                          <p className="text-sacred-beige/70 max-w-xs mx-auto">
                            {connectionInfo.qrcode ? 'Escaneie o QR Code com seu WhatsApp para conectar.' : 'Aguardando geração do QR Code ou reconexão...'}
                          </p>
                        </div>

                        {!connectionInfo.qrcode && (
                           <Button onClick={handleTriggerConnect} className="animate-pulse">
                              Gerar QR Code
                           </Button>
                        )}
                      </>
                    )}

                    {(connectionInfo.status === 'error' || connectionInfo.status === 'unauthorized') && (
                      <>
                        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
                          <AlertCircle size={40} className="text-red-400" />
                        </div>
                        <div>
                           <h4 className="text-xl font-serif text-sacred-white mb-2">
                             {connectionInfo.status === 'unauthorized' ? 'Instância Expirada/Inválida' : 'Erro de Conexão'}
                           </h4>
                           <p className="text-red-300/80 text-sm max-w-xs mx-auto">
                             {connectionInfo.status === 'unauthorized' 
                               ? 'O Token atual não é mais válido. A instância pode ter sido excluída pelo servidor.' 
                               : 'Não foi possível verificar o status. Verifique sua internet ou se a API está online.'}
                           </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                           <Button variant="outline" onClick={() => handleCheckConnection()}>Tentar Novamente</Button>
                           {connectionInfo.status === 'unauthorized' && (
                             <Button className="bg-sacred-gold text-sacred-blue hover:bg-sacred-gold/90" onClick={handleCreateInstance}>
                               Recriar Instância
                             </Button>
                           )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions / Instructions */}
                  <div className="space-y-6">


                    <div className="bg-sacred-blue/20 border border-sacred-gold/10 rounded-xl p-6">
                      <h4 className="font-serif text-lg text-sacred-beige mb-3">Instruções</h4>
                      <ul className="space-y-2 text-sm text-sacred-beige/60 list-disc list-inside">
                        <li>Abra o WhatsApp no seu celular</li>
                        <li>Vá em Configurações &gt; Aparelhos Conectados</li>
                        <li>Toque em "Conectar um aparelho"</li>
                        <li>Escaneie o QR Code exibido ao lado</li>
                        <li>Mantenha o celular conectado à internet durante os envios em massa</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* USERS TAB (Base de Fiéis) */}
            {activeTab === 'users' && (
              <div className="bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl overflow-hidden backdrop-blur-sm">
                {/* Header Actions */}
                {/* Header Actions */}
                <div className="p-4 md:p-6 border-b border-sacred-gold/10 flex flex-col gap-4">
                  <h3 className="font-serif text-2xl text-sacred-white">Base de fiéis</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="gap-2 justify-center w-full sm:w-auto">
                      <Upload size={16} />
                      Importar lista CSV
                    </Button>
                    <Button onClick={handleAddNewUser} className="gap-2 justify-center w-full sm:w-auto">
                      <Plus size={16} />
                      Novo Fiel
                    </Button>
                  </div>
                </div>

                {/* Filters Bar */}
                <div className="p-4 bg-sacred-blue/20 border-b border-sacred-gold/10 flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sacred-beige/50" size={18} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome..." 
                      className="w-full pl-10 pr-4 py-2 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white placeholder:text-sacred-beige/30 focus:outline-none focus:border-sacred-gold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto mask-linear-fade">
                    <select className="px-4 py-2 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white focus:outline-none focus:border-sacred-gold whitespace-nowrap">
                      <option value="">Filtrar por valor</option>
                      <option value="asc">Menor valor</option>
                      <option value="desc">Maior valor</option>
                    </select>

                    <select className="px-4 py-2 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white focus:outline-none focus:border-sacred-gold whitespace-nowrap">
                      <option value="">Forma de pagamento</option>
                      <option value="boleto">Boleto</option>
                      <option value="pix">Pix</option>
                      <option value="cartao">Cartão</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-sacred-blue/40 text-sacred-beige/60 text-xs uppercase tracking-wider font-medium">
                        <th className="p-4 font-normal">Nome</th>
                        <th className="p-4 font-normal">Telefone</th>
                        <th className="p-4 font-normal">Pagamentos</th>
                        <th className="p-4 font-normal">Valor Mensal</th>
                        <th className="p-4 font-normal text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sacred-gold/5">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-sacred-white/5 transition-colors group">
                          <td className="p-4">
                            <div className="font-medium text-sacred-white">{user.full_name || 'Sem nome'}</div>
                            <div className="text-xs text-sacred-beige/50">{user.email}</div>
                          </td>
                          <td className="p-4 text-sacred-beige/80 text-sm">{user.phone || '-'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.payment_status === 'Em atraso' 
                                ? 'bg-red-500/20 text-red-200' 
                                : 'bg-green-500/20 text-green-200'
                            }`}>
                              {user.payment_status || 'Em dia'}
                            </span>
                          </td>
                          <td className="p-4 text-sacred-beige/90 font-medium">
                            {user.monthly_value 
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(user.monthly_value)
                              : 'R$ 0,00'}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEditUser(user)}
                                className="p-1.5 text-sacred-gold hover:bg-sacred-gold/10 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-sacred-beige/50">
                            Nenhum usuário encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-sacred-gold/10 flex items-center justify-between text-sm text-sacred-beige/60">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 hover:text-sacred-gold disabled:opacity-50 disabled:hover:text-sacred-beige/60"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </button>
                  
                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                          currentPage === page 
                            ? 'bg-sacred-gold text-sacred-blue font-bold' 
                            : 'hover:bg-sacred-white/10'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 hover:text-sacred-gold disabled:opacity-50 disabled:hover:text-sacred-beige/60"
                  >
                    Próximo
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Module Modal */}
        <AnimatePresence>
          {isModuleModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-lg shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-2xl text-sacred-white">
                    {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
                  </h3>
                  <button onClick={() => setIsModuleModalOpen(false)} className="text-sacred-beige/50 hover:text-sacred-white">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmitModule} className="space-y-4">
                  <Input 
                    label="Título"
                    value={moduleFormData.title}
                    onChange={e => setModuleFormData({...moduleFormData, title: e.target.value})}
                    required
                  />
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-sacred-beige/80 ml-1">Descrição</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white placeholder:text-sacred-gray/30 focus:outline-none focus:border-sacred-gold focus:ring-1 focus:ring-sacred-gold/50 transition-all duration-300 backdrop-blur-sm min-h-[80px]"
                      value={moduleFormData.description}
                      onChange={e => setModuleFormData({...moduleFormData, description: e.target.value})}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-sacred-beige/80 ml-1">Capa do Card (URL)</label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                         <Input 
                          value={moduleFormData.image_url}
                          onChange={e => setModuleFormData({...moduleFormData, image_url: e.target.value})}
                          placeholder="https://..."
                        />
                      </div>
                      {moduleFormData.image_url && (
                        <div className="w-16 h-24 shrink-0 rounded bg-sacred-blue/80 overflow-hidden border border-sacred-gold/10">
                          <img src={moduleFormData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Data de Liberação"
                      type="datetime-local"
                      value={moduleFormData.release_date || ''}
                      onChange={e => setModuleFormData({...moduleFormData, release_date: e.target.value})}
                    />

                    <div className="flex flex-col gap-1.5 justify-end">
                      <label className="flex items-center gap-2 cursor-pointer p-3 bg-sacred-blue/30 rounded-md border border-sacred-gold/10 hover:bg-sacred-blue/50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={moduleFormData.is_locked}
                          onChange={e => setModuleFormData({...moduleFormData, is_locked: e.target.checked})}
                          className="w-4 h-4 text-sacred-gold rounded border-sacred-gold/30 focus:ring-sacred-gold"
                        />
                        <span className="text-sacred-white text-sm">Forçar Bloqueio (Locked)</span>
                      </label>
                    </div>
                  </div>

                  {/* Hidden fields / Additional Options */}
                  <div className="hidden">
                      {/* Icon selector kept hidden or removed if moving entirely to images, 
                          but keeping in state for compat. User didn't ask to remove it explicitly but it's less relevant. */}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsModuleModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      <Save size={18} />
                      Salvar
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* User Modal */}
        <AnimatePresence>
          {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-2xl text-sacred-white">
                    Editar Fiel
                  </h3>
                  <button onClick={() => setIsUserModalOpen(false)} className="text-sacred-beige/50 hover:text-sacred-white">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmitUser} className="space-y-4">
                  <Input 
                    label="Nome Completo"
                    value={userFormData.full_name}
                    onChange={e => setUserFormData({...userFormData, full_name: e.target.value})}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Telefone"
                      value={userFormData.phone}
                      onChange={e => setUserFormData({...userFormData, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                    />
                    <Input 
                      label="Valor Mensal (R$)"
                      type="number"
                      value={userFormData.monthly_value}
                      onChange={e => setUserFormData({...userFormData, monthly_value: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-sacred-beige/80 ml-1">Status Pagamento</label>
                      <select 
                        className="w-full px-4 py-3 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white focus:outline-none focus:border-sacred-gold"
                        value={userFormData.payment_status}
                        onChange={e => setUserFormData({...userFormData, payment_status: e.target.value as any})}
                      >
                        <option value="Em dia">Em dia</option>
                        <option value="Em atraso">Em atraso</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-4 border-t border-sacred-gold/10">
                    <label className="text-sm font-medium text-sacred-beige/80 ml-1">Função no Sistema</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="role" 
                          value="user" 
                          checked={userFormData.role === 'user'}
                          onChange={() => setUserFormData({...userFormData, role: 'user'})}
                          className="text-sacred-gold focus:ring-sacred-gold"
                        />
                        <span className="text-sacred-white">Usuário Comum</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="role" 
                          value="admin" 
                          checked={userFormData.role === 'admin'}
                          onChange={() => setUserFormData({...userFormData, role: 'admin'})}
                          className="text-sacred-gold focus:ring-sacred-gold"
                        />
                        <span className="text-sacred-white flex items-center gap-1">
                          <Shield size={14} className="text-sacred-gold" />
                          Administrador
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      <Save size={18} />
                      Salvar
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Campaign Modal */}
        <AnimatePresence>
          {isCampaignModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-lg shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-2xl text-sacred-white">
                    {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                  </h3>
                  <button onClick={() => setIsCampaignModalOpen(false)} className="text-sacred-beige/50 hover:text-sacred-white">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmitCampaign} className="space-y-4">
                  <Input 
                    label="Título da Campanha"
                    value={campaignFormData.title}
                    onChange={e => setCampaignFormData({...campaignFormData, title: e.target.value})}
                    required
                  />
                  
                  <Input 
                    label="Meta de Arrecadação (R$)"
                    type="number"
                    value={campaignFormData.goal_amount}
                    onChange={e => setCampaignFormData({...campaignFormData, goal_amount: parseFloat(e.target.value)})}
                    required
                  />

                  <Input 
                    label="Valor Arrecadado (R$)"
                    type="number"
                    value={campaignFormData.current_amount}
                    onChange={e => setCampaignFormData({...campaignFormData, current_amount: parseFloat(e.target.value)})}
                    required
                  />

                  <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsCampaignModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      <Save size={18} />
                      Salvar
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmation.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-sm shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} />
                </div>
                
                <h3 className="font-serif text-xl text-sacred-white mb-2">
                  Excluir Campanha?
                </h3>
                <p className="text-sacred-beige/70 text-sm mb-6">
                  Esta ação não pode ser desfeita.
                </p>

                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setDeleteConfirmation({ isOpen: false, id: null })}>
                    Cancelar
                  </Button>
                  <button 
                    onClick={confirmDeleteCampaign}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors text-sm"
                  >
                    Excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Broadcast Modal */}
        <AnimatePresence>
          {broadcastModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-lg shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-2xl text-sacred-white flex items-center gap-2">
                    <Send size={24} className="text-sacred-gold" />
                    Enviar WhatsApp
                  </h3>
                  {!broadcastModal.isSending && (
                    <button onClick={() => setBroadcastModal(prev => ({ ...prev, isOpen: false }))} className="text-sacred-beige/50 hover:text-sacred-white">
                      <X size={24} />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-sacred-beige/70 mb-2">Campanha Selecionada:</p>
                    <p className="text-lg text-sacred-white font-serif">{broadcastModal.campaign?.title}</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-sacred-beige/80 ml-1">Mensagem</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white placeholder:text-sacred-gray/30 focus:outline-none focus:border-sacred-gold focus:ring-1 focus:ring-sacred-gold/50 transition-all duration-300 backdrop-blur-sm min-h-[120px]"
                      value={broadcastModal.message}
                      onChange={e => setBroadcastModal({...broadcastModal, message: e.target.value})}
                      disabled={broadcastModal.isSending}
                    />
                    <p className="text-xs text-sacred-beige/40 text-right">
                      Será enviado para {users.filter(u => u.phone && u.phone.length > 8).length} fiéis
                    </p>
                  </div>

                  {broadcastModal.isSending && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-sacred-beige/70">
                        <span>Enviando...</span>
                        <span>{Math.round((broadcastModal.progress / broadcastModal.total) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-sacred-blue/50 rounded-full overflow-hidden border border-sacred-gold/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(broadcastModal.progress / broadcastModal.total) * 100}%` }}
                          className="h-full bg-sacred-gold"
                        />
                      </div>
                      <p className="text-center text-xs text-sacred-beige/50">
                        {broadcastModal.progress} de {broadcastModal.total} enviados
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
                    {!broadcastModal.isSending && (
                      <Button type="button" variant="outline" onClick={() => setBroadcastModal(prev => ({ ...prev, isOpen: false }))}>
                        Cancelar
                      </Button>
                    )}
                    <Button 
                      onClick={handleSendBroadcast}
                      disabled={broadcastModal.isSending || !broadcastModal.message}
                    >
                      {broadcastModal.isSending ? 'Enviando...' : 'Enviar Mensagem'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Scheduled Messages Modal */}
        <AnimatePresence>
          {messageModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-2xl text-sacred-white flex items-center gap-2">
                    <Clock size={24} className="text-sacred-gold" />
                    Programar Mensagens
                  </h3>
                  <button onClick={() => setMessageModal(prev => ({ ...prev, isOpen: false }))} className="text-sacred-beige/50 hover:text-sacred-white">
                    <X size={24} />
                  </button>
                </div>

                <div className="mb-6 bg-sacred-blue/50 p-4 rounded-lg border border-sacred-gold/10">
                  <h4 className="text-sm font-bold text-sacred-gold uppercase mb-4">Nova Regra de Envio</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-sacred-beige/80 ml-1">Tipo de Gatilho</label>
                        <select 
                          className="w-full px-4 py-3 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white focus:outline-none focus:border-sacred-gold"
                          value={messageForm.trigger_type}
                          onChange={e => setMessageForm(prev => ({ ...prev, trigger_type: e.target.value as any }))}
                        >
                          <option value="date">Data Específica</option>
                          <option value="amount_reached">Valor Atingido ( &gt;= )</option>
                          <option value="amount_remaining">Valor Restante ( &lt;= )</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-sacred-beige/80 ml-1">
                          {messageForm.trigger_type === 'date' ? 'Data e Hora' : 'Valor (R$)'}
                        </label>
                        {messageForm.trigger_type === 'date' ? (
                          <input 
                            type="datetime-local"
                            className="w-full px-4 py-3 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white focus:outline-none focus:border-sacred-gold [color-scheme:dark]"
                            value={messageForm.scheduled_at}
                            onChange={e => setMessageForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                          />
                        ) : (
                          <input 
                            type="number"
                            placeholder="0.00"
                            className="w-full px-4 py-3 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white focus:outline-none focus:border-sacred-gold"
                            value={messageForm.trigger_value}
                            onChange={e => setMessageForm(prev => ({ ...prev, trigger_value: e.target.value }))}
                          />
                        )}
                      </div>
                    </div>

                    <div className="bg-sacred-blue/30 p-3 rounded-lg border border-sacred-gold/5">
                      <p className="text-xs font-bold text-sacred-gold uppercase mb-2">Configuração de Envio</p>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-sacred-beige/60">Intervalo Aleatório (Min - Máx segundos)</label>
                          <div className="flex items-center gap-2">
                             <input 
                              type="number" 
                              className="w-full px-2 py-1 bg-sacred-blue/50 border border-sacred-gold/10 rounded text-sacred-white text-sm"
                              value={messageForm.min_delay}
                              onChange={e => setMessageForm(prev => ({ ...prev, min_delay: parseInt(e.target.value) || 0 }))}
                             />
                             <span className="text-sacred-beige/40">-</span>
                             <input 
                              type="number" 
                              className="w-full px-2 py-1 bg-sacred-blue/50 border border-sacred-gold/10 rounded text-sacred-white text-sm"
                              value={messageForm.max_delay}
                              onChange={e => setMessageForm(prev => ({ ...prev, max_delay: parseInt(e.target.value) || 0 }))}
                             />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] text-sacred-beige/60">Descanso (Lote / Tempo em seg)</label>
                           <div className="flex items-center gap-2">
                             <input 
                              type="number" 
                              placeholder="Qtd"
                              className="w-full px-2 py-1 bg-sacred-blue/50 border border-sacred-gold/10 rounded text-sacred-white text-sm"
                              value={messageForm.batch_size}
                              onChange={e => setMessageForm(prev => ({ ...prev, batch_size: parseInt(e.target.value) || 0 }))}
                             />
                             <span className="text-sacred-beige/40">/</span>
                             <input 
                              type="number" 
                              placeholder="Seg"
                              className="w-full px-2 py-1 bg-sacred-blue/50 border border-sacred-gold/10 rounded text-sacred-white text-sm"
                              value={messageForm.batch_interval}
                              onChange={e => setMessageForm(prev => ({ ...prev, batch_interval: parseInt(e.target.value) || 0 }))}
                             />
                           </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-sacred-beige/40">
                         {messageForm.batch_size > 0 
                           ? `Enviar para ${messageForm.batch_size} pessoas, parar por ${messageForm.batch_interval}s, depois continuar.`
                           : 'Envio contínuo com atraso aleatório entre cada mensagem.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-sacred-beige/80 ml-1">Mensagem</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white focus:outline-none focus:border-sacred-gold min-h-[80px]"
                        value={messageForm.content}
                        onChange={e => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Digite a mensagem..."
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveMessage}>
                        <Plus size={16} className="mr-2" />
                        Adicionar Agendamento
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-sacred-white uppercase mb-4">Agendamentos Existentes</h4>
                  {messageModal.loading ? (
                    <p className="text-sacred-gold text-center">Carregando...</p>
                  ) : messageModal.messages.length === 0 ? (
                    <p className="text-sacred-beige/40 text-center py-4">Nenhuma mensagem programada.</p>
                  ) : (
                    <div className="space-y-3">
                      {messageModal.messages.map(msg => (
                        <div key={msg.id} className="bg-sacred-blue/40 border border-sacred-gold/10 p-4 rounded-lg flex justify-between items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                msg.status === 'sent' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                              }`}>
                                {msg.status === 'sent' ? 'Enviado' : 'Pendente'}
                              </span>
                              <span className="text-xs text-sacred-gold font-medium">
                                {msg.trigger_type === 'date' ? '📅 Data' : msg.trigger_type === 'amount_reached' ? '💰 Valor Atingido' : '📉 Falta Atingir'}
                              </span>
                              <span className="text-xs text-sacred-white">
                                {msg.trigger_type === 'date' 
                                  ? new Date(msg.scheduled_at!).toLocaleString('pt-BR') 
                                  : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(msg.trigger_value))}
                              </span>
                            </div>
                            <p className="text-sm text-sacred-beige/80 line-clamp-2">{msg.message_content}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-red-400 hover:bg-red-500/10 p-2 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Monitor Modal */}
        <AnimatePresence>
          {monitorModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-2xl text-sacred-white flex items-center gap-2">
                    <RefreshCw size={24} className="text-sacred-gold" />
                    Monitor de Disparos em Massa (Uazapi)
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={fetchUazapiCampaigns} className="p-2 hover:bg-sacred-gold/10 rounded-full text-sacred-gold" title="Atualizar">
                      <RefreshCw size={20} />
                    </button>
                    <button onClick={() => setMonitorModal(false)} className="text-sacred-beige/50 hover:text-sacred-white">
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-sacred-blue/40 text-sacred-beige/60 text-xs uppercase tracking-wider font-medium">
                          <th className="p-4 font-normal">Info / ID</th>
                          <th className="p-4 font-normal">Status</th>
                          <th className="p-4 font-normal">Progresso</th>
                          <th className="p-4 font-normal text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sacred-gold/5">
                        {uazapiCampaigns.length === 0 ? (
                           <tr>
                             <td colSpan={4} className="p-8 text-center text-sacred-beige/40">
                               Nenhum disparo encontrado no servidor.
                             </td>
                           </tr>
                        ) : (
                          uazapiCampaigns.map((camp: any) => (
                          <tr key={camp.id} className="hover:bg-sacred-white/5 transition-colors">
                            <td className="p-4">
                              <div className="text-sm text-sacred-white font-medium">{camp.info || 'Sem informações'}</div>
                              <div className="text-xs text-sacred-beige/40 font-mono">{camp.id}</div>
                              <div className="text-xs text-sacred-beige/50 mt-1">
                                Criado em: {new Date(camp.created || new Date()).toLocaleString()}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                                camp.status === 'sending' ? 'bg-blue-500/20 text-blue-300' :
                                camp.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-300' :
                                camp.status === 'paused' ? 'bg-orange-500/20 text-orange-300' :
                                camp.status === 'done' ? 'bg-green-500/20 text-green-300' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {camp.status === 'scheduled' ? 'Agendado' : 
                                 camp.status === 'sending' ? 'Enviando' : 
                                 camp.status === 'paused' ? 'Pausado' :
                                 camp.status === 'done' ? 'Concluído' : camp.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="text-xs text-sacred-beige/70 mb-1">
                                Enviados: {camp.log_sucess ?? 0} / Total: {camp.log_total ?? 0}
                              </div>
                              <div className="h-1.5 w-full bg-sacred-white/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-sacred-gold" 
                                  style={{ width: `${Math.min(((camp.log_sucess || 0) / (camp.log_total || 1)) * 100, 100)}%` }}
                                />
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                {(camp.status === 'sending' || camp.status === 'scheduled') && (
                                  <button 
                                    onClick={() => handleControlCampaign(camp.id, 'stop')}
                                    className="p-1.5 text-orange-400 hover:bg-orange-500/10 rounded transition-colors"
                                    title="Pausar"
                                  >
                                    <PauseCircle size={18} />
                                  </button>
                                )}
                                {camp.status === 'paused' && (
                                  <button 
                                    onClick={() => handleControlCampaign(camp.id, 'continue')}
                                    className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                                    title="Continuar"
                                  >
                                    <Play size={18} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleControlCampaign(camp.id, 'delete')}
                                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          ))
                        )}
                      </tbody>
                   </table>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Alert Modal */}
        <AnimatePresence>
          {alertModal.isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-sacred-blue border border-sacred-gold/40 rounded-xl p-6 w-full max-w-sm shadow-2xl relative"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${
                  alertModal.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                  alertModal.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                  'bg-blue-500/20 border-blue-500/50 text-blue-400'
                }`}>
                  {alertModal.type === 'error' ? <AlertCircle size={32} /> : 
                   alertModal.type === 'success' ? <RefreshCw size={32} /> : <AlertCircle size={32} />} 
                </div>
                
                <h3 className="text-xl font-serif text-sacred-white text-center mb-2">
                  {alertModal.title}
                </h3>
                
                <p className="text-center text-sacred-beige/80 mb-6">
                  {alertModal.message}
                </p>
                
                <Button 
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full bg-sacred-gold text-sacred-blue hover:bg-sacred-gold/90 font-bold"
                >
                  Entendi
                </Button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmation.isOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <motion.div
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="bg-sacred-blue border border-sacred-gold/40 rounded-xl p-6 w-full max-w-sm shadow-2xl"
               >
                 <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 border-2 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                    <Trash2 size={32} className="text-red-400" />
                 </div>
                 
                 <h3 className="text-xl font-serif text-sacred-white text-center mb-2">
                   Excluir Módulo?
                 </h3>
                 
                 <p className="text-center text-sacred-beige/80 mb-6">
                   Você tem certeza que deseja excluir este módulo permanentemente? Isso removerá o módulo e seus atalhos da tela inicial.
                 </p>
                 
                 <div className="flex gap-3">
                   <button 
                     onClick={() => setDeleteConfirmation({ isOpen: false, id: null })}
                     className="flex-1 py-2.5 rounded-lg border border-sacred-gold/30 text-sacred-beige hover:bg-sacred-gold/10 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={executeDeleteModule}
                     className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg transition-colors"
                   >
                     Excluir
                   </button>
                 </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      {/* MODULE LIST MODAL */}
      <AnimatePresence>
        {isModuleListOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-sacred-blue border border-sacred-gold/30 rounded-xl p-6 w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-serif text-sacred-white">
                  {activeHomeSectionId ? 'Gerenciar Módulos da Seção' : 'Gerenciar Todos os Módulos'}
                </h3>
                <div className="flex gap-2">
                   <Button onClick={handleAddNewModule} className="gap-2 text-xs h-8">
                     <Plus size={14} />
                     Novo Módulo
                   </Button>
                   <button onClick={() => setIsModuleListOpen(false)} className="text-sacred-beige/50 hover:text-sacred-gold">
                     <X size={20} />
                   </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >

                    <SortableContext 
                      items={(activeHomeSectionId 
                        ? homeItems
                            .filter(hi => hi.section_id === activeHomeSectionId && hi.target_id)
                            .sort((a,b) => a.position - b.position)
                            .map(hi => hi.target_id!)
                        : modules.map(m => m.id)
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid gap-3">
                        {(activeHomeSectionId 
                            ? homeItems
                                .filter(hi => hi.section_id === activeHomeSectionId && hi.target_id)
                                .sort((a,b) => a.position - b.position)
                                .map(hi => modules.find(m => m.id === hi.target_id)).filter(Boolean) as Module[]
                            : modules
                        ).length === 0 ? (
                            <p className="text-sacred-beige/50 text-center py-4">
                                {activeHomeSectionId ? 'Nenhum módulo nesta seção.' : 'Nenhum módulo cadastrado'}
                            </p>
                        ) : (
                            (activeHomeSectionId 
                                ? homeItems
                                    .filter(hi => hi.section_id === activeHomeSectionId && hi.target_id)
                                    .sort((a,b) => a.position - b.position)
                                    .map(hi => modules.find(m => m.id === hi.target_id)).filter(Boolean) as Module[]
                                : modules
                            ).map((module) => (
                              <SortableModuleItem 
                                key={module.id} 
                                module={module} 
                                onEdit={handleEditModule}
                                onDelete={confirmDeleteModule}
                                onManageContent={(m) => {
                                    setIsModuleListOpen(false);
                                    setActiveModule(m);
                                }}
                              />
                            ))
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-sacred-blue/95 backdrop-blur-xl border-t border-sacred-gold/20 z-50 pb-safe">
            <div className="flex justify-between items-center px-4 py-3">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-sacred-gold' : 'text-sacred-beige/50'}`}
                >
                    <LayoutDashboard size={20} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Início</span>
                </button>
                <button 
                  onClick={() => setActiveTab('modules')}
                  className={`flex flex-col items-center gap-1 ${activeTab === 'modules' ? 'text-sacred-gold' : 'text-sacred-beige/50'}`}
                >
                    <BookOpen size={20} strokeWidth={activeTab === 'modules' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Módulos</span>
                </button>
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`flex flex-col items-center gap-1 ${activeTab === 'users' ? 'text-sacred-gold' : 'text-sacred-beige/50'}`}
                >
                    <Users size={20} strokeWidth={activeTab === 'users' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Fiéis</span>
                </button>
                <button 
                  onClick={() => setActiveTab('campaigns')}
                  className={`flex flex-col items-center gap-1 ${activeTab === 'campaigns' ? 'text-sacred-gold' : 'text-sacred-beige/50'}`}
                >
                    <Megaphone size={20} strokeWidth={activeTab === 'campaigns' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Campanhas</span>
                </button>
                <button 
                  onClick={() => setActiveTab('whatsapp')}
                  className={`flex flex-col items-center gap-1 ${activeTab === 'whatsapp' ? 'text-sacred-gold' : 'text-sacred-beige/50'}`}
                >
                    <Smartphone size={20} strokeWidth={activeTab === 'whatsapp' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Whats</span>
                </button>
                <button 
                  onClick={() => setActiveTab('financial')}
                  className={`flex flex-col items-center gap-1 ${activeTab === 'financial' ? 'text-sacred-gold' : 'text-sacred-beige/50'}`}
                >
                    <DollarSign size={20} strokeWidth={activeTab === 'financial' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Finan</span>
                </button>
            </div>
        </div>
    </Layout>
  );
}
