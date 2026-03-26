import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  LogOut, 
  Sun, 
  Moon,
  TrendingUp,
  Inbox,
  Clock,
  Calendar,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { User, DashboardData, Theme } from '../types';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, theme, setTheme }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<{name: string, compass: string, genesys: string, qa: string}[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [managerView, setManagerView] = useState<string>("CAC");
  const [directivoView, setDirectivoView] = useState<string | null>(null);
  
  const isLeader = user.vistaDash === "Líder CAC" || user.vistaDash === "Líder Premium" || user.vistaDash === "Líder Fleet";
  const isManager = user.vistaDash === "Manager";
  const isDirectivo = user.vistaDash === "Directivo";
  const effectiveRole = isManager ? `Líder ${managerView}` : user.vistaDash;

  // Date filter state - Default to January of current year
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-31`;
  });

  useEffect(() => {
    if (isLeader || isManager) {
      fetch(`/api/team-members?role=${encodeURIComponent(effectiveRole)}`)
        .then(res => res.json())
        .then(data => setTeamMembers(data))
        .catch(err => console.error("Error fetching team members:", err));
    }
  }, [effectiveRole, isLeader, isManager]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let compassParam = user.compass;
        let genesysParam = user.genesys;
        let qaParam = user.qa;

        if (effectiveRole === "Líder CAC" || effectiveRole === "Líder Premium" || effectiveRole === "Líder Fleet") {
          if (selectedAgent === "all") {
            compassParam = teamMembers.map(m => m.compass).filter(Boolean).join(',');
            genesysParam = teamMembers.map(m => m.genesys).filter(Boolean).join(',');
            qaParam = teamMembers.map(m => m.qa).filter(Boolean).join(',');
          } else {
            const agent = teamMembers.find(m => m.name === selectedAgent);
            if (agent) {
              compassParam = agent.compass;
              genesysParam = agent.genesys;
              qaParam = agent.qa;
            }
          }
        }

        if (!compassParam) compassParam = "None";
        if (!genesysParam) genesysParam = "None";
        if (!qaParam) qaParam = "None";

        let url = `/api/dashboard-data?rfc=${user.rfc}&compass=${encodeURIComponent(compassParam)}&genesys=${encodeURIComponent(genesysParam)}&qa=${encodeURIComponent(qaParam)}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        
        const res = await fetch(url);
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch if we have team members or if we're not a leader/manager
    const needsTeam = effectiveRole === "Líder CAC" || effectiveRole === "Líder Premium" || effectiveRole === "Líder Fleet";
    if (!needsTeam || teamMembers.length > 0) {
      fetchData();
    }
  }, [user, startDate, endDate, selectedAgent, teamMembers, effectiveRole]);

  const getNavOptions = () => {
    const vista = user.vistaDash;
    if (vista === "Directivo") {
      return ["Operativo", "Administrativo"];
    }
    if (vista === "Data") {
      return ["Operations", "Administrative"];
    }
    if (vista === "Manager") {
      return ["CAC", "Fleet", "Premium"];
    }
    if (vista === "Líder" || vista === "Líder CAC" || vista === "Líder Premium" || vista === "Líder Fleet") {
      return ["My Team"];
    }
    return ["My Indicators"];
  };

  const navOptions = getNavOptions();

  const handleNavClick = (option: string) => {
    if (isManager && ["CAC", "Fleet", "Premium"].includes(option)) {
      setManagerView(option);
      setSelectedAgent("all");
      setTeamMembers([]); // Reset team members to trigger fresh fetch for new role
    }
    if (isDirectivo && ["Operativo", "Administrativo"].includes(option)) {
      setDirectivoView(option);
    }
  };

  const translateRole = (role: string) => {
    switch (role) {
      case 'Directivo': return 'Director';
      case 'Data': return 'Data Analyst';
      case 'Manager': return 'Manager';
      case 'Líder': return 'Leader';
      case 'Líder CAC': return 'CAC Leader';
      case 'Líder Premium': return 'Premium Leader';
      case 'Líder Fleet': return 'Fleet Leader';
      case 'Agente': return 'Agent';
      case 'Agente CAC': return 'CAC Agent';
      case 'Agente Premium': return 'Premium Agent';
      case 'Agente Fleet': return 'Fleet Agent';
      default: return role;
    }
  };

  if (isDirectivo && !directivoView) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col md:flex-row gap-8">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.2)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDirectivoView("Operativo")}
            className="w-64 h-64 bg-primary text-slate-50 rounded-2xl flex flex-col items-center justify-center gap-4 shadow-xl transition-all"
          >
            <BarChart3 className="w-16 h-16" />
            <span className="text-2xl font-bold">Operativo</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.2)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDirectivoView("Administrativo")}
            className="w-64 h-64 bg-slate-800 text-slate-50 rounded-2xl flex flex-col items-center justify-center gap-4 shadow-xl transition-all"
          >
            <Inbox className="w-16 h-16" />
            <span className="text-2xl font-bold">Administrativo</span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8 overflow-hidden">
      <div className="w-full max-w-[177.78vh] aspect-video bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-border">
        {/* Sidebar */}
        <aside className="w-full md:w-56 border-r border-border p-4 flex flex-col bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="text-slate-50 w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">DataFlow</span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
            {navOptions.map((option) => {
              const isActive = (isManager && managerView === option) || (isDirectivo && directivoView === option);
              return (
                <motion.button
                  key={option}
                  onClick={() => handleNavClick(option)}
                  whileHover={{ x: 4, backgroundColor: isActive ? "" : "rgba(var(--primary), 0.15)" }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left outline-none ${
                    isActive ? "text-slate-50" : "text-slate-600 hover:text-primary"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary rounded-lg shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <LayoutDashboard className={`relative z-10 w-3.5 h-3.5 ${isActive ? "text-slate-50" : ""}`} />
                  <span className="relative z-10">{option}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeDot"
                      className="absolute right-2 w-1 h-1 bg-slate-200 rounded-full"
                    />
                  )}
                </motion.button>
              );
            })}

            <div className="pt-4 pb-2">
              <h3 className="text-[9px] uppercase tracking-wider text-muted font-bold px-3 mb-2">Date Filter</h3>
              <div className="px-3 space-y-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-muted font-medium">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-background border border-border rounded-md pl-7 pr-2 py-1 text-[10px] focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-muted font-medium">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-background border border-border rounded-md pl-7 pr-2 py-1 text-[10px] focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-[9px] text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {(isLeader || isManager) && (
              <div className="pt-4 pb-2">
                <h3 className="text-[9px] uppercase tracking-wider text-muted font-bold px-3 mb-2">Agent Slicer</h3>
                <div className="px-3">
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-2 py-1 text-[10px] focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="all">All Agents (Sum)</option>
                    {teamMembers.map((member) => (
                      <option key={member.name} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </nav>

          <div className="mt-auto pt-4 space-y-2 border-t border-border">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/10 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto bg-background/30 custom-scrollbar">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user.name}</h2>
              <p className="text-xs text-muted">RFC: {user.rfc} • Role: {translateRole(user.vistaDash)}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 glass-card text-xs font-medium">
              <Users className="w-3.5 h-3.5 text-primary" />
              Compass: {user.compass}
            </div>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted">Opened Cases</span>
                <Inbox className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-xl font-bold">
                {loading ? "..." : data?.abiertos ?? 0}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted">Closed Cases</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold">
                {loading ? "..." : data?.cerrados ?? 0}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.19 }}
              className="glass-card p-4 border-l-4 border-l-amber-500"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted">Backlog</span>
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold">
                {loading ? "..." : typeof data?.backlog === 'number' ? `${(data.backlog * 100).toFixed(1)}%` : "0.0%"}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted">Incoming Calls</span>
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-bold">
                {loading ? "..." : data?.contestadas ?? 0}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted">Outgoing Calls</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold">
                {loading ? "..." : data?.manejo ?? 0}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted">QA Score</span>
                <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-bold">
                {loading ? "..." : typeof data?.qa === 'number' ? `${data.qa.toFixed(1)}%` : "0%"}
              </div>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-4"
            >
              <h3 className="text-sm font-semibold mb-4">Cases Over Time</h3>
              <div className="h-[220px] w-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : data?.chartData && data.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.chartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#cbd5e1'} />
                      <XAxis 
                        dataKey="date" 
                        stroke={theme === 'dark' ? '#888' : '#475569'}
                        fontSize={10}
                        tickFormatter={(str) => {
                          try {
                            const date = new Date(str);
                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          } catch (e) {
                            return str;
                          }
                        }}
                      />
                      <YAxis 
                        stroke={theme === 'dark' ? '#888' : '#475569'}
                        fontSize={10}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8fafc',
                          border: '1px solid #94a3b8',
                          borderRadius: '6px',
                          fontSize: '10px',
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="open" 
                        name="Open" 
                        stroke="#6366f1" 
                        strokeWidth={1.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="closed" 
                        name="Closed" 
                        stroke="#10b981" 
                        strokeWidth={1.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted">
                    No chart data available
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-4"
            >
              <h3 className="text-sm font-semibold mb-4">Calls Volume</h3>
              <div className="h-[220px] w-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : data?.chartData && data.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.chartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#cbd5e1'} />
                      <XAxis 
                        dataKey="date" 
                        stroke={theme === 'dark' ? '#888' : '#475569'}
                        fontSize={10}
                        tickFormatter={(str) => {
                          try {
                            const date = new Date(str);
                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          } catch (e) {
                            return str;
                          }
                        }}
                      />
                      <YAxis 
                        stroke={theme === 'dark' ? '#888' : '#475569'}
                        fontSize={10}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8fafc',
                          border: '1px solid #94a3b8',
                          borderRadius: '6px',
                          fontSize: '10px',
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="incoming" 
                        name="Incoming" 
                        stroke="#3b82f6" 
                        strokeWidth={1.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="outgoing" 
                        name="Outgoing" 
                        stroke="#f59e0b" 
                        strokeWidth={1.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted">
                    No chart data available
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-4"
            >
              <h3 className="text-sm font-semibold mb-4">QA Score Trend</h3>
              <div className="h-[220px] w-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : data?.chartData && data.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.chartData.filter(item => item.qa && item.qa > 0)}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#333' : '#cbd5e1'} />
                      <XAxis 
                        dataKey="date" 
                        stroke={theme === 'dark' ? '#888' : '#475569'}
                        fontSize={10}
                        interval={0}
                        tickFormatter={(str) => {
                          try {
                            const date = new Date(str);
                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          } catch (e) {
                            return str;
                          }
                        }}
                      />
                      <YAxis 
                        stroke={theme === 'dark' ? '#888' : '#475569'}
                        fontSize={10}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8fafc',
                          border: '1px solid #94a3b8',
                          borderRadius: '6px',
                          fontSize: '10px',
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="qa" 
                        name="QA Score (%)" 
                        stroke="#a855f7" 
                        strokeWidth={1.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted">
                    No chart data available
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};
