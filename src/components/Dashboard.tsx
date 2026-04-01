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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
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
      <div className="min-h-screen bg-[#0b1020] flex items-center justify-center p-4">
        <div className="flex flex-col md:flex-row gap-8">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.2)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDirectivoView("Operativo")}
            className="w-64 h-64 bg-blue-500 text-white rounded-2xl flex flex-col items-center justify-center gap-4 shadow-xl transition-all border border-blue-400/20"
          >
            <BarChart3 className="w-16 h-16" />
            <span className="text-2xl font-bold">Operativo</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(255, 255, 255, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDirectivoView("Administrativo")}
            className="w-64 h-64 bg-white/5 backdrop-blur-lg text-white rounded-2xl flex flex-col items-center justify-center gap-4 shadow-xl transition-all border border-white/10"
          >
            <Inbox className="w-16 h-16" />
            <span className="text-2xl font-bold">Administrativo</span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen text-white flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-[177.78vh] aspect-video bg-white/5 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row border border-white/10">
        {/* Sidebar */}
        <aside className="w-full md:w-56 border-r border-white/10 p-4 flex flex-col bg-white/5 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-500/30 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20">
              <BarChart3 className="text-blue-400 w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none tracking-tight text-white">ORBIT</span>
              <span className="text-[6px] leading-tight text-blue-400/60 font-bold uppercase tracking-[0.15em]">
                Organizational Report of Business Insights and Trends
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 no-scrollbar">
            {navOptions.map((option) => {
              const isActive = (isManager && managerView === option) || (isDirectivo && directivoView === option);
              return (
                <motion.button
                  key={option}
                  onClick={() => handleNavClick(option)}
                  whileHover={{ x: 4, backgroundColor: isActive ? "" : "rgba(59, 130, 246, 0.15)" }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative w-full flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all text-left outline-none ${
                    isActive ? "text-white bg-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "text-white/60 bg-blue-500/10 hover:bg-blue-500/20"
                  }`}
                >
                  <LayoutDashboard className={`relative z-10 w-3 h-3 ${isActive ? "text-white" : ""}`} />
                  <span className="relative z-10">{option}</span>
                </motion.button>
              );
            })}

            <div className="pt-3 pb-1">
              <h3 className="text-[8px] uppercase tracking-wider text-muted font-bold px-2 mb-1.5">Date Filter</h3>
              <div className="px-2 space-y-1.5">
                <div className="space-y-0.5">
                  <label className="text-[8px] text-muted font-medium">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-md pl-6 pr-1 py-0.5 text-[9px] focus:ring-1 focus:ring-blue-500 outline-none text-white"
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className="text-[8px] text-white/60 font-medium">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white/40" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-md pl-6 pr-1 py-0.5 text-[9px] focus:ring-1 focus:ring-blue-500 outline-none text-white"
                    />
                  </div>
                </div>
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-[8px] text-blue-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {(isLeader || isManager) && (
              <div className="pt-3 pb-1">
                <h3 className="text-[8px] uppercase tracking-wider text-muted font-bold px-2 mb-1.5">Agent Slicer</h3>
                <div className="px-2">
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-[9px] focus:ring-1 focus:ring-blue-500 outline-none text-white appearance-none cursor-pointer"
                  >
                    <option value="all" className="bg-[#0b1020] text-white">All Agents (Sum)</option>
                    {teamMembers.map((member) => (
                      <option key={member.name} value={member.name} className="bg-[#0b1020] text-white">
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </nav>

          <div className="mt-auto pt-3 space-y-1.5 border-t border-white/10">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-5 space-y-3 overflow-hidden bg-white/5 backdrop-blur-sm no-scrollbar relative">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-1 relative z-10">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Welcome back, {user.name}</h2>
              <p className="text-[8px] font-mono text-blue-400/60 uppercase tracking-widest">
                AUTH_ID: {user.rfc.substring(0, 8)}... // SESSION_ACTIVE // ROLE: {translateRole(user.vistaDash).toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[8px] font-mono text-blue-400">
                <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                NODE_COMPASS: {user.compass}
              </div>
            </div>
          </header>

          {/* Main Dashboard Grid */}
          <div className="flex flex-col lg:flex-row gap-4 relative z-10 h-[calc(100%-4rem)]">
            {/* Left Column: Stats and Charts */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full border-[3px] border-blue-400 flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(59,130,246,0.5)] shrink-0">
                    {loading ? "..." : data?.abiertos ?? 0}
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-white/60 font-bold">Opened Cases</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="glass-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full border-[3px] border-emerald-400 flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(52,211,153,0.5)] shrink-0">
                    {loading ? "..." : data?.cerrados ?? 0}
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-white/60 font-bold">Closed Cases</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.19 }}
                  className="glass-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full border-[3px] border-amber-400 flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(251,191,36,0.5)] shrink-0">
                    {loading ? "..." : typeof data?.backlog === 'number' ? `${(data.backlog * 100).toFixed(0)}%` : "0%"}
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-white/60 font-bold">Backlog</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full border-[3px] border-purple-400 flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(168,85,247,0.5)] shrink-0">
                    {loading ? "..." : typeof data?.qa === 'number' ? `${data.qa.toFixed(0)}%` : "0%"}
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-white/60 font-bold">QA Score</p>
                  </div>
                </motion.div>
              </div>

              {/* Charts Section */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0">
                {/* Cases Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass-card p-3 flex flex-col"
                >
                  <h3 className="text-[10px] font-bold mb-2 text-white uppercase tracking-widest flex justify-between items-center shrink-0">
                    <span>Cases Over Time</span>
                    <span className="text-[7px] text-white/20 font-mono">DATA_STREAM_01</span>
                  </h3>
                  <div className="flex-1 w-full min-h-0">
                    {loading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      </div>
                    ) : data?.chartData && data.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={data.chartData}
                          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="rgba(255, 255, 255, 0.4)"
                            fontSize={8}
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
                            stroke="rgba(255, 255, 255, 0.4)"
                            fontSize={8}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1a1a1a',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              fontSize: '8px',
                              color: '#ffffff'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="open" 
                            name="Open" 
                            stroke="#60a5fa" 
                            strokeWidth={1.5}
                            dot={{ r: 2, fill: '#60a5fa', strokeWidth: 0 }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="closed" 
                            name="Closed" 
                            stroke="#34d399" 
                            strokeWidth={1.5}
                            dot={{ r: 2, fill: '#34d399', strokeWidth: 0 }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-white/40">
                        No chart data available
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Calls Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="glass-card p-3 flex flex-col"
                >
                  <h3 className="text-[10px] font-bold mb-2 text-white uppercase tracking-widest flex justify-between items-center shrink-0">
                    <span>Calls Over Time</span>
                    <span className="text-[7px] text-white/20 font-mono">DATA_STREAM_02</span>
                  </h3>
                  <div className="flex-1 w-full min-h-0">
                    {loading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      </div>
                    ) : data?.chartData && data.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={data.chartData}
                          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="rgba(255, 255, 255, 0.4)"
                            fontSize={8}
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
                            stroke="rgba(255, 255, 255, 0.4)"
                            fontSize={8}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1a1a1a',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              fontSize: '8px',
                              color: '#ffffff'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="incoming" 
                            name="Incoming" 
                            stroke="#f59e0b" 
                            strokeWidth={1.5}
                            dot={{ r: 2, fill: '#f59e0b', strokeWidth: 0 }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="outgoing" 
                            name="Outgoing" 
                            stroke="#8b5cf6" 
                            strokeWidth={1.5}
                            dot={{ r: 2, fill: '#8b5cf6', strokeWidth: 0 }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-white/40">
                        No chart data available
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* QA Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="lg:col-span-2 glass-card p-3 flex flex-col"
                >
                  <h3 className="text-[10px] font-bold mb-2 text-white uppercase tracking-widest flex justify-between items-center shrink-0">
                    <span>QA Score Over Time</span>
                    <span className="text-[7px] text-white/20 font-mono">DATA_STREAM_03</span>
                  </h3>
                  <div className="flex-1 w-full min-h-0">
                    {loading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      </div>
                    ) : data?.chartData && data.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={data.chartData.filter(d => d.qa !== undefined)}
                          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="rgba(255, 255, 255, 0.4)"
                            fontSize={8}
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
                            stroke="rgba(255, 255, 255, 0.4)"
                            fontSize={8}
                            domain={[0, 100]}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1a1a1a',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              fontSize: '8px',
                              color: '#ffffff'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="qa" 
                            name="QA Score" 
                            stroke="#ec4899" 
                            strokeWidth={1.5}
                            dot={{ r: 2, fill: '#ec4899', strokeWidth: 0 }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-white/40">
                        No chart data available
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right Column: Gauges (Airplane Dashboard Style) */}
            <div className="w-full lg:w-40 space-y-3 shrink-0">
              {(() => {
                const closedRate = data?.abiertos && data.abiertos > 0 
                  ? (data.cerrados / data.abiertos) * 100 
                  : 0;
                
                const qaScore = data?.qa ?? 0;
                const performance = (closedRate * 0.4) + (qaScore * 0.6);
                const partsPercentage = data?.partsPercentage ?? 0;

                return (
                  <>
                    <GaugeChart 
                      value={closedRate} 
                      label="Closed Rate" 
                      color="#3b82f6" 
                      delay={0.25}
                    />
                    <GaugeChart 
                      value={partsPercentage} 
                      label="% Cases Parts" 
                      color="#f59e0b" 
                      delay={0.28}
                    />
                    <GaugeChart 
                      value={performance} 
                      label="Performance" 
                      color="#10b981" 
                      delay={0.3}
                    />
                    <div className="glass-card p-3 flex flex-col items-center justify-center border-dashed border-white/10">
                      <div className="text-[7px] uppercase tracking-widest text-white/30 font-bold mb-1.5">System Status</div>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                        <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                      </div>
                      <div className="mt-1.5 text-[6px] font-mono text-white/20 uppercase">All systems nominal</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const GaugeChart = ({ value, label, color, delay }: { value: number, label: string, color: string, delay: number }) => {
  const data = [
    { value: value > 100 ? 100 : value },
    { value: 100 - (value > 100 ? 100 : value) }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="glass-card p-4 flex flex-col items-center justify-center relative overflow-hidden group border-dashed border-white/10"
    >
      <div className="absolute top-2 right-2 flex gap-0.5">
        <div className="w-0.5 h-0.5 rounded-full bg-white/20" />
        <div className="w-0.5 h-0.5 rounded-full bg-white/20" />
      </div>
      
      <h3 className="text-[8px] uppercase tracking-[0.2em] text-white font-black mb-2">{label}</h3>
      
      <div className="relative w-32 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={35}
              outerRadius={45}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} style={{ filter: `drop-shadow(0 0 5px ${color}60)` }} />
              <Cell fill="rgba(255, 255, 255, 0.03)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <span className="text-xl font-black tracking-tighter text-white/90">
            {value.toFixed(0)}
            <span className="text-[8px] ml-0.5 opacity-50">%</span>
          </span>
        </div>
      </div>

      <div className="mt-2 w-full flex justify-between items-center px-2">
        <div className="text-[6px] font-mono text-white/20">00</div>
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`w-1 h-0.5 rounded-full ${i <= (value/20) ? 'bg-white/40' : 'bg-white/5'}`} />
          ))}
        </div>
        <div className="text-[6px] font-mono text-white/20">100</div>
      </div>
    </motion.div>
  );
};
