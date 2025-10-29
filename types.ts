

export enum OperationType {
  ENTRADA = "ENTRADA",
  SAIDA = "SAÍDA",
  AJUSTE = "AJUSTE",
  DEVOLUCAO = "DEVOLUÇÃO",
}

export interface Transaction {
  id: string;
  date: string;
  output: number;
  input: number;
  invoice: string;
  value: number;
  unitKg: number;
  operation: OperationType;
  balance: number;
  observations: string;
  conferente: string;
}

export enum PalletOperationType {
  ENTRADA = "ENTRADA",
  SAIDA = "SAÍDA",
  DEVOLUCAO = "DEVOLUÇÃO",
  AJUSTE = "AJUSTE",
}

export enum PalletProfile {
  ATACADO = "ATACADO",
  VAREJO = "VAREJO",
  CROSS = "CROSS",
  DEVOLUCAO = "DEVOLUÇÃO",
}

export interface PalletTransaction {
  id: string;
  month: string;
  date: string;
  invoice: string;
  pbrInput: number;
  oneWay: number;
  pbrBroken: number;
  chepInput: number;
  chepBroken: number;
  origin: string;
  plate: string;
  driver: string;
  client: string;
  profile: PalletProfile;
  cte: string;
  operation: PalletOperationType;
  checker: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  duration: string; // "H:mm"
  output: number;
  returned: number;
  bonus: string;
  bonusId: string;
  observations: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
  password: string; // Made mandatory
  profilePicture: string; // Data URL for the image
}

// Ocorrencia types
export enum OcorrenciaOperation {
  ENTREGA = "ENTREGA",
  COLETA = "COLETA",
  DEVOLUCAO = "DEVOLUÇÃO",
  TRANSFERENCIA = "TRANSFERÊNCIA",
  RETRABALHO = "RETRABALHO",
}

export enum OcorrenciaStatus {
  ABERTA = "ABERTA",
  EM_ANALISE = "EM ANÁLISE",
  CONCLUIDA = "CONCLUÍDA",
  FECHADA = "FECHADA",
}

export interface Ocorrencia {
  id: string;
  date: string;
  plate: string;
  driver: string;
  client: string;
  cte: string[];
  invoice: string[];
  devolutionInvoice: string[];
  quantity: number;
  volumeType: string;
  monitoringReason: string;
  warehouseReason: string;
  warehouseAnalysis: string;
  receiver: string;
  responsibility: string;
  operation: OcorrenciaOperation;
  status: OcorrenciaStatus;
  photos: string[]; // Array of base64 data URLs
}


export type View = 'home' | 'generalDashboard' | 'dashboard' | 'add' | 'history' | 'palletsDashboard' | 'addPallet' | 'palletHistory' | 'settings' | 'liveChat' | 'ocorrenciasDashboard' | 'addOcorrencia' | 'ocorrenciaHistory';

export interface TransactionFilters {
  startDate: string;
  endDate: string;
  operation: string; // 'ALL' or OperationType
  conferente: string;
}

export interface PalletFilters {
  startDate: string;
  endDate: string;
  operation: string; // 'ALL' or PalletOperationType
  client: string;
  profile: string; // 'ALL' or PalletProfile
}

export interface OcorrenciaFilters {
  startDate: string;
  endDate: string;
  client: string;
  plate: string;
  driver: string;
  operation: string; // 'ALL' or OcorrenciaOperation
  responsibility: string; // Now a text search field
  status: string; // 'ALL' or OcorrenciaStatus
}