export interface User {
  rfc: string;
  name: string;
  vistaDash: string;
  clientName?: string;
  serviceDeskName?: string;
  compass: string;
  genesys: string;
  qa: string;
  isAdmin?: boolean;
}

export interface DashboardData {
  abiertos: number;
  contestadas: number;
  manejo: number;
  cerrados: number;
  aunAbiertos: number;
  backlog: number;
  partsPercentage: number;
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

export interface AIAgent {
  id: number;
  name: string;
  database_connection: string;
  prompt: string;
  json_format: string;
  output_location: string;
  created_at?: string;
}

export interface DatabaseConnection {
  id: string;
  name: string;
}
