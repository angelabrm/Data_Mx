import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  MessageSquare,
  Star
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { motion } from 'motion/react';

const data = [
  { name: 'Mon', cases: 40, calls: 24, qa: 85 },
  { name: 'Tue', cases: 30, calls: 13, qa: 88 },
  { name: 'Wed', cases: 20, calls: 98, qa: 92 },
  { name: 'Thu', cases: 27, calls: 39, qa: 90 },
  { name: 'Fri', cases: 18, calls: 48, qa: 95 },
  { name: 'Sat', cases: 23, calls: 38, qa: 89 },
  { name: 'Sun', cases: 34, calls: 43, qa: 91 },
];

export default function Dashboard({ user }: { user: any }) {
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we'd fetch components from /api/user-config
    // For now, we'll use the default ones seeded in Init DB
    setComponents([
      { type: 'stats', title: 'Operational Stats' },
      { type: 'cases_chart', title: 'Case Management' },
      { type: 'calls_chart', title: 'Call Volume' },
      { type: 'qa_chart', title: 'Quality Assurance' },
      { type: 'gauges', title: 'Performance Gauges' }
    ]);
    setLoading(false);
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64">Loading Dashboard...</div>;

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Operational Overview</h2>
        <p className="text-gray-400">Real-time performance metrics for {user.serviceDeskName || 'General Service'}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Cases" value="1,284" change="+12.5%" icon={<Activity className="text-blue-500" />} />
        <StatCard title="Avg Handling Time" value="4m 32s" change="-5.2%" icon={<Clock className="text-purple-500" />} />
        <StatCard title="Resolution Rate" value="94.2%" change="+2.1%" icon={<CheckCircle2 className="text-green-500" />} />
        <StatCard title="SLA Compliance" value="98.5%" change="+0.4%" icon={<Star className="text-yellow-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Case Management Trend">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#151b2d', border: '1px solid #ffffff10', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="cases" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCases)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Call Volume Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#151b2d', border: '1px solid #ffffff10', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="calls" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Quality Assurance Score" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} domain={[80, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#151b2d', border: '1px solid #ffffff10', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="qa" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="bg-[#151b2d] border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-6">Recent Alerts</h3>
          <div className="space-y-4">
            <AlertItem type="warning" text="SLA threshold reached for Premium Desk" time="12m ago" />
            <AlertItem type="error" text="Genesys connection timeout" time="45m ago" />
            <AlertItem type="success" text="Daily report generated" time="2h ago" />
            <AlertItem type="warning" text="High call volume detected" time="3h ago" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-[#151b2d] border border-white/5 rounded-2xl p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        <span className={`text-xs font-bold ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
          {change}
        </span>
      </div>
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </motion.div>
  );
}

function ChartCard({ title, children, className = "" }: any) {
  return (
    <div className={`bg-[#151b2d] border border-white/5 rounded-2xl p-6 ${className}`}>
      <h3 className="text-lg font-bold mb-6">{title}</h3>
      {children}
    </div>
  );
}

function AlertItem({ type, text, time }: any) {
  const colors = {
    warning: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    error: 'text-red-500 bg-red-500/10 border-red-500/20',
    success: 'text-green-500 bg-green-500/10 border-green-500/20'
  };

  return (
    <div className={`p-3 rounded-xl border flex items-start gap-3 ${colors[type as keyof typeof colors]}`}>
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium leading-tight">{text}</p>
        <p className="text-[10px] opacity-60 mt-1">{time}</p>
      </div>
    </div>
  );
}
