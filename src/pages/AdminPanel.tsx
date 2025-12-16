import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Plus, Edit2, Trash2, Save, X, Users, Shield, Search, ChevronLeft, ChevronRight, Upload, Calendar, DollarSign, QrCode, Wallet, Clock, RefreshCw, Play, PauseCircle, Settings2, AlertCircle, LayoutDashboard, Megaphone, Smartphone, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uazapi } from '../lib/uazapi';
import { AdminDesignSettings } from '../components/admin/AdminDesignSettings';

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
  current_amount?: number;
  goal_amount?: number;
  status: 'active' | 'ended'; // active = Running/Scheduled, ended = Paused/Completed
  campaign_messages?: ScheduledMessage[];
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
  target_audience?: 'all' | 'payment_status_ok' | 'payment_status_late' | 'specific';
  specific_user_ids?: string[];
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'processing';
  created_at: string;
}

const parseDateBr = (dateStr: string) => {
  // Expected format: dd/mm/yyyy hh:mm
  // Remove non numeric chars to check length or just split
  const clean = dateStr.replace(/[^0-9]/g, '');
  if (clean.length < 8) return null; // at least ddmmyyyy

  const parts = dateStr.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '00:00';

  const [day, month, year] = datePart.split('/');
  const [hour, minute] = timePart.split(':');

  if (!day || !month || !year) return null;

  // Reformat to ISO: YYYY-MM-DDTHH:mm:00
  const iso = `${year}-${month}-${day}T${hour || '00'}:${minute || '00'}:00`;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
};

const formatDateBr = (isoStr: string) => {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hour}:${minute}`;
};

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'campaigns' | 'financial' | 'whatsapp' | 'design'>('financial');
// ...
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);



  // Module Content State


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


  
  const [messageForm, setMessageForm] = useState({
    content: '',
    trigger_type: 'date' as 'date' | 'amount_reached' | 'amount_remaining',
    trigger_value: '',
    scheduled_at: '',
    min_delay: 30,
    max_delay: 120,
    batch_size: 10,
    batch_interval: 300,
    target_audience: 'all' as 'all' | 'payment_status_ok' | 'payment_status_late' | 'specific',
    specific_user_ids: [] as string[]
  });

  // Home Section & Home Items State (for section-specific module management)





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
      if (campaign.status !== 'active') continue; // Skip paused/ended campaigns

      let shouldSend = false;

      if (msg.trigger_type === 'date' && msg.scheduled_at) {
        if (new Date(msg.scheduled_at) <= new Date()) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        console.log(`Disparando mensagem programada: ${msg.id}`);
        
        // Mark as sent first (or processing) to avoid double send in next poll
        await supabase.from('campaign_messages').update({ status: 'sent', processed_at: new Date().toISOString() }).eq('id', msg.id);

        // Fetch valid phones
        // Fetch valid phones based on target audience
        let query = supabase.from('profiles').select('phone, id').not('phone', 'is', null);

        if (msg.target_audience === 'payment_status_ok') {
          query = query.eq('payment_status', 'Em dia');
        } else if (msg.target_audience === 'payment_status_late') {
          query = query.eq('payment_status', 'Em atraso');
        } else if (msg.target_audience === 'specific' && msg.specific_user_ids && msg.specific_user_ids.length > 0) {
          // Parse if it's stored as string representation of array or just use if it is array
          let ids = msg.specific_user_ids;
          if (typeof ids === 'string') {
             try { ids = JSON.parse(ids); } catch (e) { ids = []; }
          }
           // Use 'in' filter for specific IDs. 
           // Note: Supabase JS client expects an array for .in()
           if (Array.isArray(ids)) {
             query = query.in('id', ids);
           }
        }

        const { data: profiles } = await query;
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



  const fetchData = async () => {
    setLoading(true);
    // Always fetch users for dashboard stats
    const { data: usersData, error: usersError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersError) console.error('Error fetching users:', usersError);
    else setUsers(usersData || []);


    


    if (activeTab === 'campaigns' || activeTab === 'dashboard') {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, campaign_messages(*)')
        .order('created_at', { ascending: false });
      if (error) console.error('Error fetching campaigns:', error);
      else setCampaigns(data || []);
    }
    if (activeTab === 'financial' || activeTab === 'dashboard') {
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

  // --- Campaign (Now WhatsApp Blast) Handlers ---
  const handleEditCampaign = (campaign: Campaign) => {
    // Determine edit mode - simplified to Title and Status mostly, messages edit separate or here?
    // For now we assume "Edit" edits the container.
    setEditingCampaign(campaign);
    setCampaignFormData({
      title: campaign.title,
      goal_amount: 0,
      current_amount: 0,
      status: campaign.status
    });
    
    // Also load message into form if exists
    const msg = campaign.campaign_messages?.[0];
    if (msg) {
        setMessageForm({
            content: msg.message_content,
            trigger_type: 'date',
            trigger_value: '',
            scheduled_at: msg.scheduled_at ? formatDateBr(msg.scheduled_at) : '',
            min_delay: msg.min_delay || 30,
            max_delay: msg.max_delay || 120,
            batch_size: msg.batch_size || 10,
            batch_interval: msg.batch_interval || 300,
            target_audience: msg.target_audience || 'all',
            specific_user_ids: msg.specific_user_ids || []
        });
    } else {
        // Reset message form
        setMessageForm({
            content: '',
            trigger_type: 'date',
            trigger_value: '',
            scheduled_at: '',
            min_delay: 30,
            max_delay: 120,
            batch_size: 10,
            batch_interval: 300,
            target_audience: 'all',
            specific_user_ids: []
        });
    }

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
    // Reset message form
    setMessageForm({
        content: '',
        trigger_type: 'date',
        trigger_value: '',
        scheduled_at: '',
        min_delay: 30,
        max_delay: 120,
        batch_size: 10,
        batch_interval: 300,
        target_audience: 'all',
        specific_user_ids: []
    });
    setIsCampaignModalOpen(true);
  };

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageForm.content) return alert('Digite a mensagem do disparo.');

    if (!messageForm.scheduled_at) return alert('Defina a data e hora do disparo.');
    
    const parsedDate = parseDateBr(messageForm.scheduled_at);
    if (!parsedDate) return alert('Data inválida. Use o formato dd/mm/yyyy hh:mm');
    if (parsedDate <= new Date()) return alert('A data deve ser futura.');

    let campaignId = editingCampaign?.id;
    let error;

    // 1. Save/Update Campaign Container
    if (editingCampaign) {
      const { error: updateError } = await supabase.from('campaigns').update({
        title: campaignFormData.title,
        status: campaignFormData.status
      }).eq('id', editingCampaign.id);
      error = updateError;
    } else {
      const { data: newCampaign, error: insertError } = await supabase.from('campaigns').insert([{
        title: campaignFormData.title,
        status: 'active',
        goal_amount: 0, 
        current_amount: 0
      }]).select().single();
      
      if (newCampaign) campaignId = newCampaign.id;
      error = insertError;
    }

    if (error || !campaignId) {
      console.error('Error saving campaign:', error);
      return alert('Erro ao salvar campanha.');
    }

    // 2. Save/Update Linked Message (Assuming 1-to-1 for this simplified flow)
    // If editing, try to find existing message.
    let messageId = editingCampaign?.campaign_messages?.[0]?.id;

    if (messageId) {
        // Update existing
        await supabase.from('campaign_messages').update({
            message_content: messageForm.content,
            scheduled_at: parsedDate.toISOString(),
            status: 'pending',
            min_delay: messageForm.min_delay,
            max_delay: messageForm.max_delay,
            batch_size: messageForm.batch_size,
            batch_interval: messageForm.batch_interval,
            target_audience: messageForm.target_audience,
            specific_user_ids: messageForm.specific_user_ids
        }).eq('id', messageId);
    } else {
        // Insert new
        await supabase.from('campaign_messages').insert([{
            campaign_id: campaignId,
            message_content: messageForm.content,
            trigger_type: 'date',
            trigger_value: parsedDate.toISOString(),
            scheduled_at: parsedDate.toISOString(),
            status: 'pending',
            min_delay: messageForm.min_delay,
            max_delay: messageForm.max_delay,
            batch_size: messageForm.batch_size,
            batch_interval: messageForm.batch_interval,
            target_audience: messageForm.target_audience,
            specific_user_ids: messageForm.specific_user_ids
        }]);
    }

    setIsCampaignModalOpen(false);
    fetchData();
  };

  const toggleCampaignStatus = async (campaign: Campaign) => {
      const newStatus = campaign.status === 'active' ? 'ended' : 'active';
      const { error } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaign.id);
      if (error) alert('Erro ao atualizar status');
      else fetchData();
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
      let result = await uazapi.createInstance("EmillySousa");
      console.log('Resultado createInstance (Tentativa 1):', result);

      if (!result.success && (result.error?.includes('Unauthorized') || result.error?.includes('401'))) {
         const newAdminToken = prompt("O Admin Token salvo parece inválido/expirado.\n\nPor favor, insira um NOVO ADMIN TOKEN (da sua conta Uazapi/CodeChat) para criar a instância:");
         if (newAdminToken) {
            console.log('Tentando criar com Admin Token fornecido manualmente...');
            result = await uazapi.createInstance("EmillySousa", newAdminToken);
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
  // Dashboard Stats (Financial)
  const totalIncome = transactions.filter(t => t.type === 'credit' && (t.status === 'completed' || t.status === 'processing')).reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'debit' && (t.status === 'completed' || t.status === 'processing')).reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  const topExpenses = transactions
     .filter(t => t.type === 'debit')
     .sort((a, b) => b.amount - a.amount)
     .slice(0, 5);

  // Chart Data
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d;
  }).reverse().map(date => {
     const monthName = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
     const monthTx = transactions.filter(t => {
       const tDate = new Date(t.created_at);
       return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
     });
     return {
       name: monthName,
       income: monthTx.filter(t => t.type === 'credit' && (t.status === 'completed' || t.status === 'processing')).reduce((a, t) => a + t.amount, 0),
       expense: monthTx.filter(t => t.type === 'debit' && (t.status === 'completed' || t.status === 'processing')).reduce((a, t) => a + t.amount, 0)
     };
  });

  return (
    <Layout>
      <div className="space-y-8 pb-24 md:pb-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div></div>
          
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
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-lg shadow-sacred-gold/50" 
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
                Pacientes
                {activeTab === 'users' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-lg shadow-sacred-gold/50" 
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
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-lg shadow-sacred-gold/50" 
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
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-lg shadow-sacred-gold/50" 
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
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-lg shadow-sacred-gold/50" 
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('design')}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  activeTab === 'design' 
                    ? 'text-sacred-gold text-base' 
                    : 'text-sacred-beige/60 hover:text-sacred-beige'
                }`}
              >
                Design
                {activeTab === 'design' && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sacred-gold shadow-lg shadow-sacred-gold/50" 
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
            {/* DASHBOARD TAB - FINANCIAL OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-2xl text-sacred-white">Painel Financeiro</h3>
                  <div className="text-sm text-sacred-beige/60">
                    Visão geral de Entradas e Saídas
                  </div>
                </div>

                {/* Top Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Receita Total */}
                  <div className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-xl p-6 flex items-center gap-4 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-sacred-beige/60">Entradas Totais</p>
                      <p className="text-2xl font-serif text-sacred-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
                      </p>
                    </div>
                  </div>

                  {/* Despesa Total */}
                  <div className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-xl p-6 flex items-center gap-4 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-sacred-beige/60">Saídas Totais</p>
                      <p className="text-2xl font-serif text-sacred-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}
                      </p>
                    </div>
                  </div>

                  {/* Saldo */}
                  <div className="bg-sacred-blue/50 border border-sacred-gold/20 rounded-xl p-6 flex items-center gap-4 backdrop-blur-sm">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${totalBalance >= 0 ? 'bg-sacred-gold/10 text-sacred-gold' : 'bg-red-500/10 text-red-400'}`}>
                      <Wallet size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-sacred-beige/60">Saldo Líquido</p>
                      <p className={`text-2xl font-serif ${totalBalance >= 0 ? 'text-sacred-gold' : 'text-red-400'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBalance)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Chart: Entradas vs Saídas */}
                  <div className="lg:col-span-2 bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                       <h4 className="text-lg font-serif text-sacred-white">Entradas vs Saídas (Últimos 6 Meses)</h4>
                       <div className="flex gap-4 text-xs">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-green-400"></div> <span>Entrada</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-red-400"></div> <span>Saída</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="h-64 w-full flex items-end justify-between px-2 gap-2">
                      {chartData.map((data, i) => {
                        const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 100);
                        const incomeH = Math.max((data.income / maxVal) * 100, 2);
                        const expenseH = Math.max((data.expense / maxVal) * 100, 2);

                        return (
                           <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                              <div className="w-full flex justify-center items-end gap-1 h-full relative">
                                 {/* Hover Tooltip */}
                                 <div className="absolute -top-16 bg-sacred-blue border border-sacred-gold/20 p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-xs w-max">
                                    <div className="text-green-400 mb-1">Ent: {data.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                    <div className="text-red-400">Sai: {data.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                 </div>

                                 {/* Income Bar */}
                                 <motion.div 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${incomeH}%` }}
                                    className="w-1/2 bg-green-500/50 hover:bg-green-500/70 rounded-t-sm transition-colors"
                                 />
                                 {/* Expense Bar */}
                                 <motion.div 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${expenseH}%` }}
                                    className="w-1/2 bg-red-500/50 hover:bg-red-500/70 rounded-t-sm transition-colors"
                                 />
                              </div>
                              <span className="text-[10px] text-sacred-beige/50 font-medium">{data.name}</span>
                           </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Spending */}
                  <div className="bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl p-6 backdrop-blur-sm flex flex-col">
                    <h4 className="text-lg font-serif text-sacred-white mb-6">Principais Gastos</h4>
                    <div className="flex-1 overflow-auto space-y-3 custom-scrollbar pr-2">
                       {topExpenses.length === 0 ? (
                          <p className="text-center text-sacred-beige/40 text-sm mt-10">Nenhuma despesa registrada.</p>
                       ) : (
                          topExpenses.map((expense, i) => (
                             <div key={i} className="flex items-center justify-between p-3 bg-sacred-blue/40 rounded-lg border border-sacred-gold/5 hover:border-sacred-gold/20 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                   <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-300 flex items-center justify-center shrink-0 font-bold text-xs">
                                      {i + 1}
                                   </div>
                                   <div className="min-w-0">
                                      <p className="text-sm text-sacred-white truncate">{expense.description}</p>
                                      <p className="text-xs text-sacred-beige/40">{new Date(expense.created_at).toLocaleDateString()}</p>
                                   </div>
                                </div>
                                <span className="text-sm font-medium text-red-400 shrink-0">
                                   - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount)}
                                </span>
                             </div>
                          ))
                       )}
                    </div>
                  </div>
                </div>


              </div>
            )}



            {/* CAMPAIGNS TAB - WHATSAPP BLASTS */}
            {activeTab === 'campaigns' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-serif text-2xl text-sacred-white">Disparos WhatsApp</h3>
                    <p className="text-sacred-beige/60 text-sm">Gerencie suas campanhas de mensagens em massa.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={handleOpenMonitor} className="gap-2 justify-center w-full sm:w-auto">
                       <RefreshCw size={16} />
                       Monitorar Envios
                    </Button>
                    <Button onClick={handleAddNewCampaign} className="gap-2 justify-center w-full sm:w-auto">
                      <Plus size={20} />
                      Novo Disparo
                    </Button>
                  </div>
                </div>

                {/* Campaigns List */}
                <div className="grid grid-cols-1 gap-4">
                    {campaigns.length === 0 ? (
                        <div className="text-center py-10 text-sacred-beige/40 bg-sacred-blue/20 rounded-xl border border-sacred-gold/10">
                            Nenhum disparo criado.
                        </div>
                    ) : (
                        campaigns.map(campaign => {
                            const message = campaign.campaign_messages?.[0];
                            const isPaused = campaign.status !== 'active';
                            const isSent = message?.status === 'sent';
                            
                            return (
                                <div key={campaign.id} className={`bg-sacred-blue/40 border ${isPaused ? 'border-sacred-gold/10' : 'border-sacred-gold/30'} rounded-xl p-6 backdrop-blur-sm transition-all hover:bg-sacred-blue/50`}>
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className={`font-serif text-xl ${isPaused ? 'text-sacred-white/60' : 'text-sacred-white'}`}>{campaign.title}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                                    isSent ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                                                    isPaused ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                                                    'bg-blue-500/20 border-blue-500/30 text-blue-400'
                                                }`}>
                                                    {isSent ? 'Enviado' : isPaused ? 'Pausado' : 'Agendado'}
                                                </span>
                                            </div>
                                            
                                            {message && (
                                                <div className="bg-sacred-blue/40 p-3 rounded-lg border border-sacred-white/5 text-sm text-sacred-beige/80 italic">
                                                    "{message.message_content}"
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 text-xs text-sacred-beige/50">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {message?.scheduled_at ? new Date(message.scheduled_at).toLocaleString('pt-BR') : 'Sem data'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users size={12} />
                                                    Todos os Pacientes
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start md:self-center">
                                            {!isSent && (
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => toggleCampaignStatus(campaign)}
                                                    className={`w-10 h-10 p-0 rounded-full ${isPaused ? 'hover:bg-green-500/20 hover:text-green-400' : 'hover:bg-yellow-500/20 hover:text-yellow-400'}`}
                                                    title={isPaused ? "Retomar" : "Pausar"}
                                                >
                                                    {isPaused ? <Play size={18} /> : <PauseCircle size={18} />}
                                                </Button>
                                            )}
                                            
                                            <Button 
                                                variant="outline" 
                                                onClick={() => handleEditCampaign(campaign)}
                                                className="w-10 h-10 p-0 rounded-full hover:bg-sacred-gold/10 hover:text-sacred-gold"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </Button>

                                            <Button 
                                                variant="outline" 
                                                onClick={() => handleDeleteCampaign(campaign.id)}
                                                className="w-10 h-10 p-0 rounded-full hover:bg-red-500/20 hover:text-red-400 border-red-500/20"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
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

            {/* DESIGN TAB */}
            {activeTab === 'design' && (
              <AdminDesignSettings />
            )}

            {/* USERS TAB (Pacientes) */}.
            {activeTab === 'users' && (
              <div className="bg-sacred-blue/30 border border-sacred-gold/20 rounded-xl overflow-hidden backdrop-blur-sm">
                {/* Header Actions */}
                {/* Header Actions */}
                <div className="p-4 md:p-6 border-b border-sacred-gold/10 flex flex-col gap-4">
                  <h3 className="font-serif text-2xl text-sacred-white">Pacientes</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="gap-2 justify-center w-full sm:w-auto">
                      <Upload size={16} />
                      Importar lista CSV
                    </Button>
                    <Button onClick={handleAddNewUser} className="gap-2 justify-center w-full sm:w-auto">
                      <Plus size={16} />
                      Novo Paciente
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
                    Editar Paciente
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
        {/* Campaign Modal (New Blast) */}
        <AnimatePresence>
          {isCampaignModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-sacred-blue border border-sacred-gold/30 rounded-xl w-full max-w-lg shadow-2xl p-6 overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-serif text-sacred-white">
                    {editingCampaign ? 'Editar Disparo' : 'Novo Disparo'}
                  </h3>
                  <button onClick={() => setIsCampaignModalOpen(false)} className="text-sacred-beige/60 hover:text-sacred-gold">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmitCampaign} className="space-y-4">
                  <Input
                    label="Nome da Campanha"
                    value={campaignFormData.title}
                    onChange={e => setCampaignFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Feliz Natal 2024"
                    required
                  />

                  <div className="space-y-1">
                     <label className="text-sm font-medium text-sacred-beige/80">Mensagem</label>
                     <textarea
                        className="w-full h-32 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md p-3 text-sacred-white focus:outline-none focus:border-sacred-gold/50 resize-none font-sans"
                        placeholder="Digite a mensagem que será enviada..."
                        value={messageForm.content}
                        onChange={e => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                        required
                     />
                  </div>

                  <Input
                    type="text"
                    label="Data e Hora do Disparo"
                    placeholder="dd/mm/yyyy hh:mm"
                    value={messageForm.scheduled_at}
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v.length > 12) v = v.slice(0, 12);
                      
                      let formatted = v;
                      if (v.length > 2) formatted = `${v.slice(0, 2)}/${v.slice(2)}`;
                      if (v.length > 4) formatted = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
                      if (v.length > 8) formatted = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4, 8)} ${v.slice(8)}`;
                      if (v.length > 10) formatted = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4, 8)} ${v.slice(8, 10)}:${v.slice(10)}`;

                      setMessageForm(prev => ({ ...prev, scheduled_at: formatted }));
                    }}
                    required
                  />

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-sacred-beige/80">Público Alvo</label>
                    <select
                      className="w-full px-4 py-3 bg-sacred-blue/50 border border-sacred-gold/20 rounded-md text-sacred-white focus:outline-none focus:border-sacred-gold"
                      value={messageForm.target_audience}
                      onChange={e => {
                        const val = e.target.value;
                        setMessageForm(prev => ({ ...prev, target_audience: val as any, specific_user_ids: [] }));
                      }}
                    >
                      <option value="all">Todos os Pacientes</option>
                      <option value="payment_status_ok">Apenas Em Dia</option>
                      <option value="payment_status_late">Apenas Em Atraso</option>
                      <option value="specific">Selecionar Manualmente</option>
                    </select>
                  </div>

                  {messageForm.target_audience === 'specific' && (
                    <div className="bg-sacred-blue/30 p-4 rounded-lg border border-sacred-gold/10 max-h-48 overflow-y-auto">
                      <h4 className="text-sm font-medium text-sacred-gold mb-2">Selecione os Pacientes:</h4>
                      <div className="space-y-2">
                        {users.map(user => (
                          <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={messageForm.specific_user_ids?.includes(user.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setMessageForm(prev => {
                                  const currentIds = prev.specific_user_ids || [];
                                  if (checked) {
                                    return { ...prev, specific_user_ids: [...currentIds, user.id] };
                                  } else {
                                    return { ...prev, specific_user_ids: currentIds.filter(id => id !== user.id) };
                                  }
                                });
                              }}
                              className="rounded border-sacred-gold/30 bg-black/20 text-sacred-gold focus:ring-sacred-gold"
                            />
                            <span className="text-sm text-sacred-white">{user.full_name || 'Sem Nome'}</span>
                            <span className="text-xs text-sacred-beige/40 ml-auto">{user.payment_status}</span>
                          </label>
                        ))}
                        {users.length === 0 && <p className="text-xs text-sacred-beige/40">Nenhum usuário cadastrado.</p>}
                      </div>
                    </div>
                  )}

                  {/* Advanced Settings Toggle or Block */}
                  <div className="bg-sacred-blue/30 p-4 rounded-lg border border-sacred-gold/10">
                     <h4 className="text-sm font-medium text-sacred-gold mb-2 flex items-center gap-2">
                        <Settings2 size={14} /> Configurações Avançadas (Opcional)
                     </h4>
                     <div className="grid grid-cols-2 gap-4">
                        <Input
                           type="number"
                           label="Delay Min (s)"
                           value={messageForm.min_delay}
                           onChange={e => setMessageForm(prev => ({ ...prev, min_delay: Number(e.target.value) }))}
                        />
                        <Input
                           type="number"
                           label="Delay Max (s)"
                           value={messageForm.max_delay}
                           onChange={e => setMessageForm(prev => ({ ...prev, max_delay: Number(e.target.value) }))}
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4 mt-4">
                        <Input
                           type="number"
                           label="Lote (Qtd)"
                           value={messageForm.batch_size}
                           onChange={e => setMessageForm(prev => ({ ...prev, batch_size: Number(e.target.value) }))}
                        />
                        <Input
                           type="number"
                           label="Intervalo Lote (s)"
                           value={messageForm.batch_interval}
                           onChange={e => setMessageForm(prev => ({ ...prev, batch_interval: Number(e.target.value) }))}
                        />
                     </div>
                     <p className="text-[10px] text-sacred-beige/40 mt-2">
                        Padrão: Delay 30-120s. Lote 10 msgs a cada 300s (5min).
                     </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsCampaignModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      <Save size={18} className="mr-2" />
                      {editingCampaign ? 'Salvar Alterações' : 'Agendar Disparo'}
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


        {/* Scheduled Messages Modal */}

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



        {/* Delete Confirmation Modal */}

      </div>


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
                  onClick={() => setActiveTab('users')}
                  className={`flex flex-col items-center gap-1 ${activeTab === 'users' ? 'text-sacred-gold' : 'text-sacred-beige/50'}`}
                >
                    <Users size={20} strokeWidth={activeTab === 'users' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Pacientes</span>
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
                <button 
                  onClick={() => setActiveTab('design')}
                  className={`flex flex-col items-center gap-1 ${activeTab === 'design' ? 'text-sacred-gold' : 'text-sacred-beige/50'}`}
                >
                    <Palette size={20} strokeWidth={activeTab === 'design' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Design</span>
                </button>
            </div>
        </div>
    </Layout>
  );
}
