import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Layout, 
  Plus, 
  Trash2, 
  Save, 
  Settings, 
  ChevronRight,
  Shield,
  UserPlus
} from 'lucide-react';

interface Client {
  id: number;
  name: string;
}

interface ServiceDesk {
  id: number;
  client_id: number;
  name: string;
}

interface Role {
  id: number;
  service_desk_id: number;
  name: string;
  client_name?: string;
  service_desk_name?: string;
}

interface View {
  id: number;
  role_id: number;
  name: string;
  order_index: number;
}

interface Component {
  id: number;
  view_id: number;
  type: string;
  title: string;
  config: any;
  order_index: number;
}

interface Override {
  rfc: string;
  role_id: number | null;
  is_admin: boolean;
  role_name?: string;
  client_name?: string;
  service_desk_name?: string;
}

interface AdminPanelProps {
  onConfigChange?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onConfigChange }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceDesks, setServiceDesks] = useState<ServiceDesk[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedServiceDesk, setSelectedServiceDesk] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedView, setSelectedView] = useState<number | null>(null);
  
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Inline form states
  const [newClientName, setNewClientName] = useState('');
  const [newServiceDeskName, setNewServiceDeskName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newViewName, setNewViewName] = useState('');
  const [newCompTitle, setNewCompTitle] = useState('');
  const [newCompType, setNewCompType] = useState('stats');
  const [newOverrideRfc, setNewOverrideRfc] = useState('');
  const [newOverrideIsAdmin, setNewOverrideIsAdmin] = useState(false);
  const [newOverrideRoleId, setNewOverrideRoleId] = useState<string>('');

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      const data = await res.json();
      setClients(data.clients || []);
      setServiceDesks(data.serviceDesks || []);
      setRoles(data.roles || []);
      setViews(data.views || []);
      setComponents(data.components || []);
      setOverrides(data.overrides || []);
    } catch (err: any) {
      console.error("Error fetching admin config:", err);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddClient = async () => {
    if (!newClientName) return;
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'client', data: { name: newClientName } })
      });
      setNewClientName('');
      showStatus("Client added");
      setHasChanges(true);
      fetchData();
    } catch (err) {
      showStatus("Failed to add client", "error");
    }
  };

  const handleAddServiceDesk = async (clientId: number) => {
    if (!newServiceDeskName) return;
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'service_desk', data: { client_id: clientId, name: newServiceDeskName } })
      });
      setNewServiceDeskName('');
      showStatus("Service Desk added");
      setHasChanges(true);
      fetchData();
    } catch (err) {
      showStatus("Failed to add service desk", "error");
    }
  };

  const handleAddRole = async (serviceDeskId: number) => {
    if (!newRoleName) return;
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'role', data: { service_desk_id: serviceDeskId, name: newRoleName } })
      });
      setNewRoleName('');
      showStatus("Role added");
      setHasChanges(true);
      fetchData();
    } catch (err) {
      showStatus("Failed to add role", "error");
    }
  };

  const handleAddView = async (roleId: number) => {
    if (!newViewName) return;
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'view', data: { role_id: roleId, name: newViewName, order_index: views.filter(v => v.role_id === roleId).length } })
      });
      setNewViewName('');
      showStatus("View added");
      setHasChanges(true);
      fetchData();
    } catch (err) {
      showStatus("Failed to add view", "error");
    }
  };

  const handleAddComponent = async (viewId: number) => {
    if (!newCompTitle) return;
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'component', data: { view_id: viewId, type: newCompType, title: newCompTitle, config: {}, order_index: components.filter(c => c.view_id === viewId).length } })
      });
      setNewCompTitle('');
      showStatus("Component added");
      setHasChanges(true);
      fetchData();
    } catch (err) {
      showStatus("Failed to add component", "error");
    }
  };

  const handleAddOverride = async () => {
    if (!newOverrideRfc) return;
    try {
      const roleId = newOverrideRoleId ? parseInt(newOverrideRoleId) : null;
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'override', data: { rfc: newOverrideRfc, role_id: roleId, is_admin: newOverrideIsAdmin } })
      });
      setNewOverrideRfc('');
      setNewOverrideRoleId('');
      showStatus("Override added");
      setHasChanges(true);
      fetchData();
    } catch (err) {
      showStatus("Failed to add override", "error");
    }
  };

  const handleDelete = async (type: string, id: any) => {
    try {
      await fetch(`/api/admin/config?type=${type}&id=${id}`, { method: 'DELETE' });
      showStatus(`${type} deleted`);
      setHasChanges(true);
      fetchData();
    } catch (err) {
      showStatus(`Failed to delete ${type}`, "error");
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Since changes are already saved to DB on each action,
      // we just need to notify the parent to refresh the dashboard
      if (onConfigChange) {
        onConfigChange();
      }
      showStatus("All changes applied!");
      setHasChanges(false);
    } catch (err) {
      showStatus("Error applying changes", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Admin Config...</div>;

  return (
    <div className="h-full flex flex-col bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <Shield className="text-white w-5 h-5" />
          <h2 className="text-lg font-bold tracking-tight">Admin Control Center</h2>
        </div>
        <div className="flex gap-2 items-center">
          {statusMsg && (
            <motion.span 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[9px] px-2 py-0.5 rounded ${statusMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
            >
              {statusMsg.text}
            </motion.span>
          )}
          <button 
            disabled={isInitializing}
            onClick={async () => {
              setIsInitializing(true);
              try {
                const res = await fetch('/api/admin/init', { method: 'POST' });
                const data = await res.json();
                showStatus(data.message || data.error);
                setHasChanges(true);
                fetchData();
              } catch (err) {
                showStatus("Init failed", "error");
              } finally {
                setIsInitializing(false);
              }
            }}
            className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
          >
            {isInitializing ? 'Initialising...' : 'Init DB'}
          </button>
          <button 
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
              hasChanges 
                ? 'bg-white text-[#0b1020] shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                : 'bg-white/5 text-white/40 border border-white/10'
            }`}
          >
            <Save size={10} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button 
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${activeTab === 'roles' ? 'bg-white text-[#0b1020]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          >
            Roles & Views
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white text-[#0b1020]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          >
            User Overrides
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'roles' ? (
          <div className="grid grid-cols-4 gap-4 h-full">
            {/* Clients Column */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/40">Clients</h3>
              </div>
              <div className="flex gap-1 px-2 mb-3">
                <input 
                  type="text" 
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="New client..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                />
                <button onClick={handleAddClient} className="p-1 bg-white/10 text-white rounded-lg hover:bg-white/20"><Plus size={14} /></button>
              </div>
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => { setSelectedClient(client.id); setSelectedServiceDesk(null); setSelectedRole(null); setSelectedView(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${selectedClient === client.id ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'} border`}
                >
                  <span>{client.name}</span>
                  <div className="flex items-center gap-1">
                    <Trash2 size={12} className="text-red-400/50 hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleDelete('client', client.id); }} />
                    <ChevronRight size={14} />
                  </div>
                </button>
              ))}
            </div>

            {/* Service Desks Column */}
            <div className="space-y-2 border-l border-white/10 pl-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/40">Service Desks</h3>
              </div>
              {selectedClient && (
                <div className="flex gap-1 px-2 mb-3">
                  <input 
                    type="text" 
                    value={newServiceDeskName}
                    onChange={(e) => setNewServiceDeskName(e.target.value)}
                    placeholder="New service desk..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                  />
                  <button onClick={() => handleAddServiceDesk(selectedClient)} className="p-1 bg-white/10 text-white rounded-lg hover:bg-white/20"><Plus size={14} /></button>
                </div>
              )}
              {!selectedClient ? (
                <div className="text-[10px] text-white/20 text-center mt-10">Select a client</div>
              ) : (
                serviceDesks.filter(sd => sd.client_id === selectedClient).map(sd => (
                  <button
                    key={sd.id}
                    onClick={() => { setSelectedServiceDesk(sd.id); setSelectedRole(null); setSelectedView(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${selectedServiceDesk === sd.id ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'} border`}
                  >
                    <span>{sd.name}</span>
                    <div className="flex items-center gap-1">
                      <Trash2 size={12} className="text-red-400/50 hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleDelete('service_desk', sd.id); }} />
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Roles Column */}
            <div className="space-y-2 border-l border-white/10 pl-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/40">Roles</h3>
              </div>
              {selectedServiceDesk && (
                <div className="flex gap-1 px-2 mb-3">
                  <input 
                    type="text" 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="New role..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                  />
                  <button onClick={() => handleAddRole(selectedServiceDesk)} className="p-1 bg-white/10 text-white rounded-lg hover:bg-white/20"><Plus size={14} /></button>
                </div>
              )}
              {!selectedServiceDesk ? (
                <div className="text-[10px] text-white/20 text-center mt-10">Select a service desk</div>
              ) : (
                roles.filter(r => r.service_desk_id === selectedServiceDesk).map(role => (
                  <button
                    key={role.id}
                    onClick={() => { setSelectedRole(role.id); setSelectedView(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${selectedRole === role.id ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'} border`}
                  >
                    <span>{role.name}</span>
                    <div className="flex items-center gap-1">
                      <Trash2 size={12} className="text-red-400/50 hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleDelete('role', role.id); }} />
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Views & Components Column */}
            <div className="space-y-4 border-l border-white/10 pl-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/40">Views</h3>
                {selectedRole && (
                  <div className="flex gap-1 px-2 mb-3">
                    <input 
                      type="text" 
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      placeholder="New view..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                    />
                    <button onClick={() => handleAddView(selectedRole)} className="p-1 bg-white/10 text-white rounded-lg hover:bg-white/20"><Plus size={14} /></button>
                  </div>
                )}
                {!selectedRole ? (
                  <div className="text-[10px] text-white/20 text-center mt-10">Select a role</div>
                ) : (
                  views.filter(v => v.role_id === selectedRole).map(view => (
                    <button
                      key={view.id}
                      onClick={() => setSelectedView(view.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${selectedView === view.id ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'} border`}
                    >
                      <span>{view.name}</span>
                      <div className="flex items-center gap-1">
                        <Trash2 size={12} className="text-red-400/50 hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleDelete('view', view.id); }} />
                        <ChevronRight size={14} />
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedView && (
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/40">Components</h3>
                  <div className="space-y-1 px-2 mb-3">
                    <input 
                      type="text" 
                      value={newCompTitle}
                      onChange={(e) => setNewCompTitle(e.target.value)}
                      placeholder="Component title..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500/50"
                    />
                    <div className="flex gap-1">
                      <select 
                        value={newCompType}
                        onChange={(e) => setNewCompType(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60 focus:outline-none"
                      >
                        <option value="stats" className="bg-[#0b1020] text-white">Stats Grid</option>
                        <option value="cases_chart" className="bg-[#0b1020] text-white">Cases Chart</option>
                        <option value="calls_chart" className="bg-[#0b1020] text-white">Calls Chart</option>
                        <option value="qa_chart" className="bg-[#0b1020] text-white">QA Chart</option>
                        <option value="gauges" className="bg-[#0b1020] text-white">Gauges Panel</option>
                      </select>
                      <button onClick={() => handleAddComponent(selectedView)} className="p-1 bg-white/10 text-white rounded-lg hover:bg-white/20"><Plus size={14} /></button>
                    </div>
                  </div>
                  {components.filter(c => c.view_id === selectedView).map(comp => (
                    <div
                      key={comp.id}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white/80"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">{comp.title}</span>
                        <span className="text-[8px] text-white/40 uppercase">{comp.type}</span>
                      </div>
                      <Trash2 size={12} className="text-red-400/50 hover:text-red-400 cursor-pointer" onClick={() => handleDelete('component', comp.id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl mb-4">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/40">Add New Override</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input 
                  type="text" 
                  value={newOverrideRfc}
                  onChange={(e) => setNewOverrideRfc(e.target.value)}
                  placeholder="User RFC..."
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                />
                <select 
                  value={newOverrideRoleId}
                  onChange={(e) => setNewOverrideRoleId(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/60 focus:outline-none"
                >
                  <option value="">No Role Change</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.client_name} - {r.service_desk_name} - {r.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newOverrideIsAdmin}
                    onChange={(e) => setNewOverrideIsAdmin(e.target.checked)}
                    className="w-3 h-3 rounded border-white/20 bg-transparent"
                  />
                  <span className="text-[10px] text-white/60">Admin Access</span>
                </label>
                <button 
                  onClick={handleAddOverride}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white text-[#0b1020] rounded-lg text-xs font-bold hover:bg-white/90 transition-colors"
                >
                  <UserPlus size={14} />
                  Save Override
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/40 px-2">Existing Overrides</h3>
              <div className="grid grid-cols-1 gap-2">
              {overrides.map(override => (
                <div key={override.rfc} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">
                      {override.rfc.substring(0, 2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{override.rfc}</span>
                      <span className="text-[9px] text-white/40">
                        Role: {override.role_name ? `${override.client_name} - ${override.service_desk_name} - ${override.role_name}` : 'None'} | Admin: {override.is_admin ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete('override', override.rfc)} className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
