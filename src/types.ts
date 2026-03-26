export interface User {
  rfc: string;
  name: string;
  vistaDash: string;
  compass: string;
  genesys: string;
  qa: string;
}

export interface DashboardData {
  abiertos: number;
  contestadas: number;
  manejo: number;
  cerrados: number;
  aunAbiertos: number;
  backlog: number;
  qa?: number;
  chartData: {
    date: string;
    open: number;
    closed: number;
    aunAbiertos: number;
    incoming: number;
    outgoing: number;
    qa?: number;
  }[];
}

export type Theme = 'light' | 'dark';
