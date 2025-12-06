// Environment variables
const UAZAPI_TOKEN = import.meta.env.VITE_UAZAPI_TOKEN;
// Hardcoded temporarily to ensure validity during hot reload
const UAZAPI_ADMIN_TOKEN = import.meta.env.VITE_UAZAPI_ADMIN_TOKEN || 'ZaW1qwTEkuq7Ub1cBUuyMiK5bNSu3nnMQ9lh7klElc2clSRV8t'; 
const UAZAPI_URL = import.meta.env.VITE_UAZAPI_URL || 'https://uazapi.com/api/v2';

export interface SendMessageResponse {
  success: boolean;
  message?: string;
  id?: string;
}

export const uazapi = {
  async sendMessage(phone: string, text: string): Promise<SendMessageResponse> {
    const token = UAZAPI_TOKEN ? UAZAPI_TOKEN.trim() : '';
    console.log(`Sending message to ${phone} with Instance Token (${token.substring(0, 5)}...)`);

    try {
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone;
      }

      const response = await fetch(`${UAZAPI_URL}/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': token,
          'token': token,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: text,
          linkPreview: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Uazapi error response:', data);
        
        if (response.status === 401) {
          console.warn('Token rejected. Instance might be deleted or token is wrong.');
        }
        
        throw new Error(data?.error || data?.message || 'Failed to send message');
      }

      return { success: true, id: data.id };
    } catch (error: any) {
      console.error('Uazapi send error:', error);
      if (error.message === 'Failed to fetch') {
        alert('Erro de Conexão: O navegador bloqueou a requisição (Provável erro de CORS). A API da Uazapi não permite chamadas direto do navegador (localhost).');
      } 
      return { success: false, message: error.message };
    }
  },

  async broadcast(
    phones: string[], 
    text: string, 
    onProgress?: (current: number, total: number) => void,
    config: { minDelay?: number; maxDelay?: number; batchSize?: number; batchInterval?: number } = {}
  ): Promise<{ successCount: number; failCount: number }> {
    let successCount = 0;
    let failCount = 0;
    const total = phones.length;

    const minDelay = (config.minDelay || 2) * 1000;
    const maxDelay = (config.maxDelay || 5) * 1000;
    const batchSize = config.batchSize || 0;
    const batchInterval = (config.batchInterval || 60) * 1000;

    for (let i = 0; i < total; i++) {
        const phone = phones[i];
        const result = await this.sendMessage(phone, text);
        
        if (result.success) successCount++;
        else failCount++;

        if (onProgress) onProgress(i + 1, total);
        
        // Batch Rest Logic
        if (batchSize > 0 && (i + 1) % batchSize === 0 && (i + 1) < total) {
            console.log(`Pausando por ${batchInterval/1000} segundos (Batch de ${batchSize})...`);
            await new Promise(resolve => setTimeout(resolve, batchInterval));
        } else {
            // Random Delay between users
            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return { successCount, failCount };
  },

  async getStatus(): Promise<{ status: string; qrcode?: string; number?: string; name?: string }> {
    const token = UAZAPI_TOKEN ? UAZAPI_TOKEN.trim() : '';
    try {
      const response = await fetch(`${UAZAPI_URL}/instance/status`, {
        method: 'GET',
        headers: { 
          'apikey': token,
          'token': token,
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) return { status: 'unauthorized' }; 

      const data = await response.json();
      
      const instanceData = data.instance || {};
      const status = instanceData.status || 'disconnected';
      const qrcode = instanceData.qrcode;
      const number = instanceData.owner ? instanceData.owner.split('@')[0] : '';
      const name = instanceData.profileName || instanceData.name;
      
      return { status, qrcode, number, name };
    } catch (error) {
      console.error('Status check failed:', error);
      return { status: 'error' };
    }
  },

  async connect(): Promise<boolean> {
    const token = UAZAPI_TOKEN ? UAZAPI_TOKEN.trim() : '';
    try {
      const response = await fetch(`${UAZAPI_URL}/instance/connect`, {
        method: 'POST', 
        headers: { 
          'apikey': token,
          'token': token, 
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Connect trigger failed:', error);
      return false;
    }
  },

  async disconnect(): Promise<boolean> {
    const token = UAZAPI_TOKEN ? UAZAPI_TOKEN.trim() : '';
    try {
      const response = await fetch(`${UAZAPI_URL}/instance/disconnect`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': token,
          'token': token, 
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Disconnect failed:', error);
      return false;
    }
  },

  async updatePresence(presence: 'available' | 'unavailable'): Promise<boolean> {
    const token = UAZAPI_TOKEN ? UAZAPI_TOKEN.trim() : '';
    try {
      const response = await fetch(`${UAZAPI_URL}/instance/presence`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': token,
          'token': token,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ presence })
      });
      return response.ok;
    } catch (error) {
      console.error('Presence update failed:', error);
      return false;
    }
  },

  async createInstance(name: string, overrideAdminToken?: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const adminToken = overrideAdminToken || UAZAPI_ADMIN_TOKEN;
    
    if (!adminToken) {
        return { success: false, error: 'Admin Token not configured in env' };
    }
    
    try {
        const response = await fetch(`${UAZAPI_URL}/instance/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': adminToken,
                'token': adminToken,
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ instanceName: name })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const newToken = data.token || data.key || (data.instance && data.instance.token) || data.hash?.apikey;
            return { success: true, token: newToken };
        } else {
            return { success: false, error: data.error || data.message || 'Unknown error during instance creation' };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
  },

  // --- Mass Sender Endpoints ---

  async createCampaign(
    phones: string[],
    text: string,
    config: { 
      minDelay: number; 
      maxDelay: number; 
      scheduled_for?: number; 
      info?: string;
      batchSize?: number;
      batchInterval?: number;
    }
  ): Promise<{ success: boolean; campaigns?: any[]; error?: string }> {
    const token = UAZAPI_TOKEN ? UAZAPI_TOKEN.trim() : '';
    
    // Clean phones
    const cleanPhones = phones.map(p => {
      let clean = p.replace(/\D/g, '');
      if (clean.length <= 11 && !clean.startsWith('55')) clean = '55' + clean;
      return clean + '@s.whatsapp.net'; // Uazapi format for numbers array often requires suffix or full format check
    });

    const minDelay = config.minDelay || 10;
    const maxDelay = config.maxDelay || 30;
    const batchSize = config.batchSize || 0;
    const batchInterval = (config.batchInterval || 0); // seconds

    const batches = [];
    if (batchSize > 0) {
        for (let i = 0; i < cleanPhones.length; i += batchSize) {
            batches.push(cleanPhones.slice(i, i + batchSize));
        }
    } else {
        batches.push(cleanPhones);
    }

    const createdCampaigns = [];
    let currentSchedule = config.scheduled_for || new Date().getTime();

    for (let i = 0; i < batches.length; i++) {
        const batchNumbers = batches[i];
        
        // Skip empty batches
        if (batchNumbers.length === 0) continue;

        const payload = {
            numbers: batchNumbers,
            type: 'text',
            delayMin: minDelay,
            delayMax: maxDelay,
            scheduled_for: currentSchedule, // ms
            info: config.info ? `${config.info} (Part ${i+1}/${batches.length})` : `Campaign Part ${i+1}`,
            text: text,
            linkPreview: true
        };

        try {
            const response = await fetch(`${UAZAPI_URL}/sender/simple`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': token,
                    'token': token,
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                createdCampaigns.push(data);
            } else {
                console.error('Failed to create campaign part', i, data);
                return { success: false, error: data.error || 'Failed to create one of the campaign batches' };
            }
        } catch (e: any) {
             return { success: false, error: e.message };
        }

        // Increment schedule for next batch
        if (batchInterval > 0) {
            currentSchedule += (batchInterval * 1000);
        }
    }

    return { success: true, campaigns: createdCampaigns };
  },

  async controlCampaign(folderId: string, action: 'stop' | 'continue' | 'delete'): Promise<boolean> {
      const token = UAZAPI_TOKEN ? UAZAPI_TOKEN.trim() : '';
      try {
          const response = await fetch(`${UAZAPI_URL}/sender/edit`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'apikey': token,
                  'token': token,
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ folder_id: folderId, action })
          });
          return response.ok;
      } catch (e) {
          console.error(e);
          return false;
      }
  },

  async listCampaigns(status?: string): Promise<any[]> {
      const token = UAZAPI_TOKEN ? UAZAPI_TOKEN.trim() : '';
      try {
          const url = new URL(`${UAZAPI_URL}/sender/listfolders`);
          if (status) url.searchParams.append('status', status);
          
          const response = await fetch(url.toString(), {
              method: 'GET',
              headers: {
                  'apikey': token,
                  'token': token,
                  'Authorization': `Bearer ${token}`
              }
          });
          if (response.ok) return await response.json();
          return [];
      } catch (e) {
          console.error(e);
          return [];
      }
  }
};
