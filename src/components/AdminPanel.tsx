import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Database, 
  ChevronRight, 
  Layout, 
  Users, 
  Settings,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanel() {
  const [config, setConfig] = useState<any>({
    clients: [],
    serviceDesks: [],
    roles: [],
    overrides: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitDB = async () => {
    if (!confirm('Are you sure you want to re-initialize the database? This will delete all current configurations.')) return;
    
    try {
      setLoading(true);
      const res = await fetch('/api/admin/init', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Database initialized successfully!' });
        fetchConfig();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Init failed: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'All changes saved successfully!' });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Save failed: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const [newClientName, setNewClientName] = useState('');

  const addClient = () => {
    if (!newClientName.trim()) return;
    const newClient = {
      id: Date.now(), // Temporary ID
      name: newClientName
    };
    setConfig({
      ...config,
      clients: [...config.clients, newClient]
    });
    setNewClientName('');
  };

  const removeClient = (id: number) => {
    setConfig({
      ...config,
      clients: config.clients.filter((c: any) => c.id !== id)
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Configuration</h2>
          <p className="text-gray-400 text-sm">Manage clients, service desks, and role-based dashboard views.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleInitDB}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-all text-sm font-medium"
          >
            <Database size={16} />
            Init DB
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            SAVE CHANGES
          </button>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-lg flex items-center gap-3 border ${
              message.type === 'success' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients Section */}
        <div className="bg-[#151b2d] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              Clients
            </h3>
          </div>
          <div className="p-4 border-b border-white/5 flex gap-2">
            <input
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="New client name..."
              className="flex-1 bg-[#0b1020] border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button 
              onClick={addClient}
              className="p-1.5 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="p-2 max-h-[400px] overflow-y-auto">
            {config.clients.map((client: any) => (
              <div key={client.id} className="p-3 hover:bg-white/5 rounded-lg flex items-center justify-between group cursor-pointer">
                <span className="text-sm font-medium">{client.name}</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removeClient(client.id)}
                    className="p-1 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={14} className="text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Desks Section */}
        <div className="bg-[#151b2d] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Settings size={18} className="text-purple-400" />
              Service Desks
            </h3>
            <button className="p-1 hover:bg-white/10 rounded transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="p-2">
            {config.serviceDesks.map((sd: any) => (
              <div key={sd.id} className="p-3 hover:bg-white/5 rounded-lg flex items-center justify-between group cursor-pointer">
                <div>
                  <p className="text-sm font-medium">{sd.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Client ID: {sd.client_id}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 hover:text-red-400"><Trash2 size={14} /></button>
                  <ChevronRight size={14} className="text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roles Section */}
        <div className="bg-[#151b2d] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Layout size={18} className="text-green-400" />
              Roles & Views
            </h3>
            <button className="p-1 hover:bg-white/10 rounded transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="p-2">
            {config.roles.map((role: any) => (
              <div key={role.id} className="p-3 hover:bg-white/5 rounded-lg flex items-center justify-between group cursor-pointer">
                <div>
                  <p className="text-sm font-medium">{role.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{role.client_name} / {role.service_desk_name}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 hover:text-red-400"><Trash2 size={14} /></button>
                  <ChevronRight size={14} className="text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
