import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Database, 
  Terminal, 
  Code, 
  MapPin,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { AIAgent, DatabaseConnection } from '../types';

export const AgentsManager: React.FC = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<number | null>(null); // ID of agent being edited or -1 for new
  const [formData, setFormData] = useState<Partial<AIAgent>>({
    name: '',
    database_connection: '',
    prompt: '',
    json_format: '',
    output_location: ''
  });

  useEffect(() => {
    fetchAgents();
    fetchDatabases();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/ai-agents');
      const data = await res.json();
      setAgents(data);
    } catch (err) {
      setError('Error fetching agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/available-databases');
      const data = await res.json();
      setDatabases(data);
    } catch (err) {
      console.error('Error fetching databases:', err);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.database_connection) {
      setError('Name and Database Connection are required');
      return;
    }

    setLoading(true);
    try {
      const url = isEditing === -1 ? '/api/ai-agents' : `/api/ai-agents/${isEditing}`;
      const method = isEditing === -1 ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsEditing(null);
        setFormData({ name: '', database_connection: '', prompt: '', json_format: '', output_location: '' });
        fetchAgents();
      } else {
        setError('Error saving agent');
      }
    } catch (err) {
      setError('Error saving agent');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      const res = await fetch(`/api/ai-agents/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAgents();
    } catch (err) {
      setError('Error deleting agent');
    }
  };

  const startEdit = (agent: AIAgent) => {
    setIsEditing(agent.id);
    setFormData(agent);
  };

  const startNew = () => {
    setIsEditing(-1);
    setFormData({ name: '', database_connection: '', prompt: '', json_format: '', output_location: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">AI Agents Manager</h2>
          <p className="text-sm text-slate-400">Create and manage your AI data analysis agents</p>
        </div>
        <button 
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold rounded-xl transition-all shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>New Agent</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <AnimatePresence>
        {isEditing !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-100">
                {isEditing === -1 ? 'Create New Agent' : 'Edit Agent'}
              </h3>
              <button onClick={() => setIsEditing(null)} className="text-slate-400 hover:text-slate-100">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Agent Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Sales Analyst"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Database Connection</label>
                <select 
                  value={formData.database_connection}
                  onChange={e => setFormData({...formData, database_connection: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 appearance-none"
                >
                  <option value="">Select a database...</option>
                  {databases.map(db => (
                    <option key={db.id} value={db.id}>{db.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Prompt Instructions</label>
              <textarea 
                value={formData.prompt}
                onChange={e => setFormData({...formData, prompt: e.target.value})}
                placeholder="What should this agent do with the data?"
                rows={4}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">JSON Output Format</label>
                <textarea 
                  value={formData.json_format}
                  onChange={e => setFormData({...formData, json_format: e.target.value})}
                  placeholder='{ "result": "string", "score": "number" }'
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Output Location / Space Name</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={formData.output_location}
                    onChange={e => setFormData({...formData, output_location: e.target.value})}
                    placeholder="e.g., temp_analysis_table"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 px-1">This is the unique ID you will use to call this agent's results from other visualizations.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setIsEditing(null)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>Save Agent</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {loading && agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
            <p className="text-slate-400">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-slate-800/30 border border-dashed border-slate-700/50 rounded-2xl">
            <Terminal className="w-12 h-12 text-slate-600" />
            <p className="text-slate-400">No AI agents configured yet.</p>
            <button onClick={startNew} className="text-teal-400 hover:underline">Create your first agent</button>
          </div>
        ) : (
          agents.map(agent => (
            <motion.div 
              key={agent.id}
              layout
              className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                    <Terminal className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-100">{agent.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Database className="w-3.5 h-3.5" />
                        {databases.find(db => db.id === agent.database_connection)?.name || agent.database_connection}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5" />
                        Space: <code className="text-teal-400 bg-teal-400/5 px-1 rounded">{agent.output_location}</code>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEdit(agent)}
                    className="p-2 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-lg transition-all"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(agent.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Terminal className="w-3 h-3" />
                    Prompt
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-3 italic">"{agent.prompt}"</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Code className="w-3 h-3" />
                    Format
                  </div>
                  <pre className="text-[11px] text-teal-400/80 font-mono overflow-hidden text-ellipsis">
                    {agent.json_format}
                  </pre>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
