

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Transaction, OperationType, PalletTransaction, PalletOperationType, PalletProfile, User, TransactionFilters, PalletFilters, Ocorrencia, OcorrenciaOperation, OcorrenciaStatus, OcorrenciaFilters } from './types';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionTable from './components/TransactionTable';
import PalletDashboard from './components/PalletDashboard';
import PalletForm from './components/PalletForm';
import PalletTable from './components/PalletTable';
import OcorrenciaDashboard from './components/OcorrenciaDashboard';
import OcorrenciaForm from './components/OcorrenciaForm';
import OcorrenciaTable from './components/OcorrenciaTable';
import Settings from './components/Settings';
import LiveChat from './components/LiveChat'; // Keep LiveChat
import Home from './components/Home'; // Import the new Home component
import GeneralDashboard from './components/GeneralDashboard'; // Import the new General Dashboard

import { SearchIcon, BellIcon, XIcon, CheckCircleIcon, ExclamationCircleIcon, ShareIcon } from './components/Icons';
import SearchResults from './components/SearchResults';

import Sidebar from './components/Sidebar';
import { View } from './types';
import LoginPage from './components/LoginPage';
// Import Input and Button components for the user edit form
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';
import ShareModal from './components/ShareModal';

const rawInitialTransactions = [
  { date: '2025-10-22', output: 0, input: 30, invoice: '25459', value: 1920, operation: OperationType.ENTRADA, conferente: 'EDUARDO', observations: '' },
  { date: '2025-10-22', output: 6, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'ALEX', observations: 'PAGAMENTO - TP' },
  { date: '2025-10-22', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.DEVOLUCAO, conferente: 'CRISTIANO', observations: 'DEVOLUÇÃO VIANA 37#. 4 PALETES RETRABALHANDOS DEVOLUÇÃO VIANA' },
  { date: '2025-10-22', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.DEVOLUCAO, conferente: 'CRISTIANO', observations: 'DEVOLUÇÃO VIANA 37#. 15 PALETES RETRABALHANDOS DEVOLUÇÃO VIANA' },
  { date: '2025-10-22', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.DEVOLUCAO, conferente: 'CRISTIANO', observations: 'DEVOLUÇÃO VIANA 37#. 9 PALETES RETRABALHANDOS DEVOLUÇÃO VIANA' },
  { date: '2025-10-22', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'LEONARDO', observations: 'Cliente: MONDELEZ' },
  { date: '2025-10-23', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'CRISTIANO', observations: 'Cliente: MONDELEZ' },
  { date: '2025-10-23', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'ISAQUE', observations: 'Cliente: MONDELEZ' },
  { date: '2025-10-24', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'CRISTIANO', observations: 'Cliente: MONDELEZ' },
  { date: '2025-10-24', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'JEFFERSON', observations: 'Cliente: MONDELEZ' },
  { date: '2025-10-25', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'CRISTIANO', observations: 'Cliente: JOHNSON' },
  { date: '2025-10-25', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'JEFFERSON', observations: 'Cliente: MONDELEZ. 20 PALETES RETRABALHADO PARA DEVOLUÇÃO 37#' },
  { date: '2025-10-27', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'CRISTIANO', observations: 'Cliente: MONDELEZ' },
  { date: '2025-10-27', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'LUIZ', observations: 'Cliente: JOHNSON. 01 PALETES RETRABALHADO PARA DEVOLUÇÃO 37#' },
  { date: '2025-10-28', output: 1, input: 0, invoice: '', value: 0, operation: OperationType.SAIDA, conferente: 'CRISTIANO', observations: 'Cliente: JOHNSON' },
].map(t => ({ ...t, id: crypto.randomUUID() }));


const initialPalletTransactions: PalletTransaction[] = [];

const initialOcorrencias: Ocorrencia[] = [
    { id: crypto.randomUUID(), date: '2025-10-29', plate: 'RST-4E55', driver: 'JOÃO SILVA', client: 'MONDELEZ', cte: ['987456'], invoice: ['458722'], devolutionInvoice: ['145872'], quantity: 24, volumeType: 'CX', monitoringReason: 'AVARIA DETECTADA NA ROTA', warehouseReason: 'EMBALAGEM VIOLADA', warehouseAnalysis: 'CONFERIDO PARCIAL', receiver: 'LUCAS', responsibility: 'TRANSPORTADORA', operation: OcorrenciaOperation.DEVOLUCAO, status: OcorrenciaStatus.CONCLUIDA, photos: [] },
    { id: crypto.randomUUID(), date: '2025-10-29', plate: 'RFE-7T32', driver: 'MARCOS ALVES', client: 'SC JOHNSON', cte: ['995421'], invoice: ['456331'], devolutionInvoice: [], quantity: 18, volumeType: 'CX', monitoringReason: 'DIVERGÊNCIA DE QUANTIDADE', warehouseReason: 'QUANTIDADE MENOR', warehouseAnalysis: 'AJUSTE EFETUADO', receiver: 'ANA', responsibility: 'ARMAZÉM', operation: OcorrenciaOperation.ENTREGA, status: OcorrenciaStatus.ABERTA, photos: [] },
];

const initialUsers: User[] = [
    { id: '5', name: 'Eduardo', role: 'Admin', password: '30732090', profilePicture: 'https://i.pravatar.cc/40?u=eduardo' },
]

const SHARE_TOKEN = 'logmam-transport-view-only-access-2024';

const guestUser: User = {
    id: 'guest',
    name: 'Convidado',
    role: 'Visualização',
    password: '',
    profilePicture: 'https://i.pravatar.cc/40?u=guest'
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info'; // Added 'info' type
}

const initialTransactionFilters: TransactionFilters = {
    startDate: '',
    endDate: '',
    operation: 'ALL',
    conferente: '',
};

const initialPalletFilters: PalletFilters = {
    startDate: '',
    endDate: '',
    operation: 'ALL',
    client: '',
    profile: 'ALL',
};

const initialOcorrenciaFilters: OcorrenciaFilters = {
    startDate: '',
    endDate: '',
    client: '',
    plate: '',
    driver: '',
    operation: 'ALL',
    responsibility: '',
    status: 'ALL',
};


const Toast: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    
    const startExit = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
    }, [onDismiss, toast.id]);

    useEffect(() => {
        const timer = setTimeout(startExit, 4700);
        return () => clearTimeout(timer);
    }, [startExit]);

    const isSuccess = toast.type === 'success';
    const isInfo = toast.type === 'info';
    const isError = toast.type === 'error';

    let bgColor = 'bg-gray-700';
    let Icon = BellIcon;

    if (isSuccess) {
        bgColor = 'bg-accent-success';
        Icon = CheckCircleIcon;
    } else if (isError) {
        bgColor = 'bg-accent-error';
        Icon = ExclamationCircleIcon;
    } else if (isInfo) {
        bgColor = 'bg-accent-info';
        Icon = BellIcon;
    }

    return (
        <div
            className={`flex items-start p-4 mb-4 rounded-xl shadow-lg text-white ${bgColor} transition-all duration-300 ease-in-out transform ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
        >
            <div className="flex-shrink-0 pt-0.5">
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
                <button onClick={startExit} className="inline-flex text-white rounded-md p-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
                    <span className="sr-only">Dismiss</span>
                    <XIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};


const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-5 right-5 z-[100] w-full max-w-sm">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
            ))}
        </div>
    );
};

// System performance messages for Bell Icon
const performanceMessages = [
    'Sistema operando em ótimo desempenho!',
    'Atenção: Uso de memória elevado, monitorando...',
    'Rede estável. Todas as operações online.',
    'Pico de transações processado com sucesso.',
    'Verificação de integridade de dados agendada para esta noite.',
    'Novas atualizações de segurança aplicadas com sucesso.'
];
let currentMessageIndex = 0;


const App: React.FC = () => {
    const recalculateBalances = useCallback((transactionsList: Omit<Transaction, 'balance' | 'unitKg'>[]): Transaction[] => {
    const sorted = [...transactionsList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.reduce<Transaction[]>((acc, t) => {
      const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      const unitKg = t.input > 0 && t.value > 0 ? t.value / t.input : 0;
      let balanceChange = 0;
      switch(t.operation) {
        case OperationType.ENTRADA: balanceChange = t.input; break;
        case OperationType.SAIDA: balanceChange = -t.output; break;
        case OperationType.AJUSTE: balanceChange = t.input; break;
        case OperationType.DEVOLUCAO: balanceChange = -t.output; break;
      }
      const balance = prevBalance + balanceChange;
      acc.push({ ...t, unitKg: parseFloat(unitKg.toFixed(2)), balance });
      return acc;
    }, []);
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  
  // --- STATE PERSISTENCE ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
        const stored = localStorage.getItem('logmam_transactions');
        if (stored) return JSON.parse(stored);
    } catch (e) { console.error("Failed to parse transactions from localStorage", e); }
    return recalculateBalances(rawInitialTransactions);
  });
  
  const [palletTransactions, setPalletTransactions] = useState<PalletTransaction[]>(() => {
    try {
        const stored = localStorage.getItem('logmam_pallet_transactions');
        if (stored) return JSON.parse(stored);
    } catch (e) { console.error("Failed to parse pallet transactions from localStorage", e); }
    return initialPalletTransactions;
  });

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(() => {
    try {
        const stored = localStorage.getItem('logmam_ocorrencias');
        if (stored) return JSON.parse(stored);
    } catch (e) { console.error("Failed to parse ocorrencias from localStorage", e); }
    return initialOcorrencias;
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
        const stored = localStorage.getItem('logmam_users');
        if (stored) return JSON.parse(stored);
    } catch (e) { console.error("Failed to parse users from localStorage", e); }
    return initialUsers;
  });

  useEffect(() => {
    try {
        localStorage.setItem('logmam_transactions', JSON.stringify(transactions));
    } catch (e) { console.error("Failed to save transactions to localStorage", e); }
  }, [transactions]);
  
  useEffect(() => {
    try {
        localStorage.setItem('logmam_pallet_transactions', JSON.stringify(palletTransactions));
    } catch (e) { console.error("Failed to save pallet transactions to localStorage", e); }
  }, [palletTransactions]);

  useEffect(() => {
    try {
        localStorage.setItem('logmam_ocorrencias', JSON.stringify(ocorrencias));
    } catch (e) { console.error("Failed to save ocorrencias to localStorage", e); }
  }, [ocorrencias]);

  useEffect(() => {
    try {
        localStorage.setItem('logmam_users', JSON.stringify(users));
    } catch (e) { console.error("Failed to save users to localStorage", e); }
  }, [users]);
  // --- END OF STATE PERSISTENCE ---

  const [currentUser, setCurrentUser] = useState<User | null>(null); // Track the logged-in user
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<View>('home');

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingPalletTransaction, setEditingPalletTransaction] = useState<PalletTransaction | null>(null);
  const [editingOcorrencia, setEditingOcorrencia] = useState<Ocorrencia | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // State for table filters (lifted from tables)
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>(initialTransactionFilters);
  const [palletFilters, setPalletFilters] = useState<PalletFilters>(initialPalletFilters);
  const [ocorrenciaFilters, setOcorrenciaFilters] = useState<OcorrenciaFilters>(initialOcorrenciaFilters);


  // Check for share link on initial load
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const shareId = queryParams.get('share_id');
    if (shareId === SHARE_TOKEN) {
        setIsGuestMode(true);
        setIsAuthenticated(true);
        setCurrentUser(guestUser);

        const view = queryParams.get('view') as View;
        if (view) {
            setActiveView(view);
        } else {
            setActiveView('home');
        }
        
        // Pre-fill filters from URL params
        if (view === 'history') {
            setTransactionFilters({
                startDate: queryParams.get('startDate') || '',
                endDate: queryParams.get('endDate') || '',
                operation: queryParams.get('operation') || 'ALL',
                conferente: queryParams.get('conferente') || '',
            });
        } else if (view === 'palletHistory') {
            setPalletFilters({
                startDate: queryParams.get('startDate') || '',
                endDate: queryParams.get('endDate') || '',
                operation: queryParams.get('operation') || 'ALL',
                client: queryParams.get('client') || '',
                profile: queryParams.get('profile') || 'ALL',
            });
        }
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
      const id = crypto.randomUUID();
      setToasts(currentToasts => [...currentToasts, { id, message, type }]);
  }, []);

  const handleLogin = useCallback((userName: string, pass: string): boolean => {
    const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
    if (user && user.password === pass) {
      setIsAuthenticated(true);
      setCurrentUser(user);
      setActiveView('home'); // Set default view to home on login
      return true;
    }
    return false;
  }, [users]);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsGuestMode(false);
    // Clear query params from URL on logout
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
            setIsSearchFocused(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const addTransaction = useCallback((newTransactionData: Omit<Transaction, 'balance' | 'unitKg' | 'id'>) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite adicionar dados.', 'error');
        return;
    }
    const transactionWithId = { ...newTransactionData, id: crypto.randomUUID() };
    setTransactions(currentTransactions => recalculateBalances([...currentTransactions, transactionWithId]));
    setActiveView('history');
    addToast('Movimentação adicionada com sucesso!', 'success');
  }, [recalculateBalances, addToast, isGuestMode]);
  
  const updateTransaction = useCallback((updatedTransaction: Transaction) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite editar dados.', 'error');
        return;
    }
    setTransactions(currentTransactions => {
        const updatedList = currentTransactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
        return recalculateBalances(updatedList);
    });
    setEditingTransaction(null);
    addToast('Movimentação atualizada com sucesso!', 'success');
  }, [recalculateBalances, addToast, isGuestMode]);
  
  const deleteTransaction = useCallback((id: string) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite excluir dados.', 'error');
        return;
    }
    if (!window.confirm("Tem certeza que deseja excluir esta movimentação?")) return;
    setTransactions(currentTransactions => {
        const filtered = currentTransactions.filter(t => t.id !== id);
        return recalculateBalances(filtered);
    });
    addToast('Movimentação excluída com sucesso!', 'info');
  }, [recalculateBalances, addToast, isGuestMode]);

  // New function to clear all stretch film transactions
  const clearAllStretchFilmTransactions = useCallback(() => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite limpar dados.', 'error');
        return;
    }
    setTransactions([]);
    addToast('Todas as movimentações de filme stretch foram apagadas.', 'info');
  }, [addToast, isGuestMode]);

  const addPalletTransaction = useCallback((newTransactionData: Omit<PalletTransaction, 'id'| 'month' | 'duration'>) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite adicionar dados.', 'error');
        return;
    }
    const date = new Date(newTransactionData.date);
    const month = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

    const [startH, startM] = newTransactionData.startTime.split(':').map(Number);
    const [endH, endM] = newTransactionData.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diffMinutes = endMinutes - startMinutes;
    const durationH = Math.floor(diffMinutes / 60);
    const durationM = diffMinutes % 60;
    const duration = `${durationH}:${durationM.toString().padStart(2, '0')}`;

    const fullTransaction: PalletTransaction = {
        ...newTransactionData,
        id: crypto.randomUUID(),
        month: capitalizedMonth,
        duration: duration,
    };

    setPalletTransactions(currentTransactions => [...currentTransactions, fullTransaction]);
    setActiveView('palletHistory');
    addToast('Movimentação de palete adicionada com sucesso!', 'success');
  }, [addToast, isGuestMode]);

  const updatePalletTransaction = useCallback((updatedTransaction: PalletTransaction) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite editar dados.', 'error');
        return;
    }
    setPalletTransactions(currentTransactions => currentTransactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    setEditingPalletTransaction(null);
    addToast('Movimentação de palete atualizada com sucesso!', 'success');
  }, [addToast, isGuestMode]);

  const deletePalletTransaction = useCallback((id: string) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite excluir dados.', 'error');
        return;
    }
    if (!window.confirm("Tem certeza que deseja excluir esta movimentação de palete?")) return;
    setPalletTransactions(currentTransactions => currentTransactions.filter(t => t.id !== id));
    addToast('Movimentação de palete excluída com sucesso!', 'info');
  }, [addToast, isGuestMode]);

  // New function to clear all pallet transactions
  const clearAllPalletTransactions = useCallback(() => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite limpar dados.', 'error');
        return;
    }
    setPalletTransactions([]);
    addToast('Todas as movimentações de paletes foram apagadas.', 'info');
  }, [addToast, isGuestMode]);

  const addOcorrencia = useCallback((newOcorrenciaData: Omit<Ocorrencia, 'id'>) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite adicionar dados.', 'error');
        return;
    }
    const ocorrenciaWithId = { ...newOcorrenciaData, id: crypto.randomUUID() };
    setOcorrencias(current => [...current, ocorrenciaWithId]);
    setActiveView('ocorrenciaHistory');
    addToast('Ocorrência adicionada com sucesso!', 'success');
  }, [addToast, isGuestMode]);

  const updateOcorrencia = useCallback((updatedOcorrencia: Ocorrencia) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite editar dados.', 'error');
        return;
    }
    setOcorrencias(current => current.map(o => o.id === updatedOcorrencia.id ? updatedOcorrencia : o));
    setEditingOcorrencia(null);
    addToast('Ocorrência atualizada com sucesso!', 'success');
  }, [addToast, isGuestMode]);

  const deleteOcorrencia = useCallback((id: string) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite excluir dados.', 'error');
        return;
    }
    if (!window.confirm("Tem certeza que deseja excluir esta ocorrência?")) return;
    setOcorrencias(current => current.filter(o => o.id !== id));
    addToast('Ocorrência excluída com sucesso!', 'info');
  }, [addToast, isGuestMode]);
  
  const addUser = useCallback((newUserData: Omit<User, 'id'>) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite adicionar usuários.', 'error');
        return;
    }
    const newUser: User = { ...newUserData, id: crypto.randomUUID() };
    setUsers(currentUsers => [...currentUsers, newUser]); // Append to existing users
    addToast('Usuário adicionado com sucesso!', 'success');
  }, [addToast, isGuestMode]);

  const updateUser = useCallback((updatedUser: User) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite editar usuários.', 'error');
        return;
    }
    setUsers(currentUsers => currentUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
    setEditingUser(null);
    addToast('Usuário atualizado com sucesso!', 'success');
  }, [addToast, isGuestMode]);

  const deleteUser = useCallback((id: string) => {
    if (isGuestMode) {
        addToast('Acesso de convidado não permite excluir usuários.', 'error');
        return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este usuário?")) return;
    setUsers(currentUsers => currentUsers.filter(u => u.id !== id));
    addToast('Usuário excluído com sucesso!', 'info');
  }, [addToast, isGuestMode]);


  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);
  
  const currentBalance = useMemo(() => {
      const sortedByDateAsc = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return sortedByDateAsc.length > 0 ? sortedByDateAsc[sortedByDateAsc.length - 1].balance : 0;
  }, [transactions]);

  const sortedPalletTransactions = useMemo(() => {
    return [...palletTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [palletTransactions]);
  
  const sortedOcorrencias = useMemo(() => {
    return [...ocorrencias].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ocorrencias]);

  const viewTitles: Record<View, string> = {
    home: 'Início',
    generalDashboard: 'Dashboard Geral',
    dashboard: 'Dashboard Resumo - Filme Stretch',
    add: 'Adicionar Movimentação - Filme Stretch',
    history: 'Histórico de Movimentações - Filme Stretch',
    palletsDashboard: 'Dashboard - Paletes',
    addPallet: 'Adicionar Movimentação - Paletes',
    palletHistory: 'Histórico de Movimentações - Paletes',
    ocorrenciasDashboard: 'Dashboard - Ocorrências',
    addOcorrencia: 'Adicionar Nova Ocorrência',
    ocorrenciaHistory: 'Histórico de Ocorrências',
    settings: 'Configurações Gerais & Usuários',
    liveChat: 'Chat de Voz com Verônica',
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
        return { transactions: [], palletTransactions: [], users: [], ocorrencias: [] };
    }

    const lowerCaseQuery = searchQuery.toLowerCase();

    const filteredTransactions = transactions.filter(t => {
        const searchableFields = [
            t.invoice,
            t.observations,
            t.operation,
            t.conferente,
        ];
        return searchableFields.some(field =>
            field && String(field).toLowerCase().includes(lowerCaseQuery)
        );
    }).slice(0, 5);

    const filteredPalletTransactions = palletTransactions.filter(p => {
        const searchableFields = [
            p.invoice, p.origin, p.plate, p.driver, p.client, p.profile,
            p.cte, p.operation, p.checker, p.bonus, p.bonusId, p.observations
        ];
        return searchableFields.some(field =>
            field && String(field).toLowerCase().includes(lowerCaseQuery)
        );
    }).slice(0, 5);

    const filteredOcorrencias = ocorrencias.filter(o => {
        const searchableFields = [
            o.plate, o.driver, o.client, ...o.cte, ...o.invoice, ...o.devolutionInvoice,
            o.monitoringReason, o.warehouseReason, o.warehouseAnalysis, o.receiver
        ];
        return searchableFields.some(field =>
            field && String(field).toLowerCase().includes(lowerCaseQuery)
        );
    }).slice(0, 5);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(lowerCaseQuery) ||
        u.role.toLowerCase().includes(lowerCaseQuery)
    ).slice(0, 5);

    return {
        transactions: filteredTransactions,
        palletTransactions: filteredPalletTransactions,
        users: filteredUsers,
        ocorrencias: filteredOcorrencias,
    };
  }, [searchQuery, transactions, palletTransactions, users, ocorrencias]);

  const handleSearchResultClick = (type: 'transaction' | 'pallet' | 'user' | 'ocorrencia', id: string) => {
      if (type === 'transaction') {
          setActiveView('history');
      } else if (type === 'pallet') {
          setActiveView('palletHistory');
      } else if (type === 'user') {
          setActiveView('settings');
      } else if (type === 'ocorrencia') {
          setActiveView('ocorrenciaHistory');
      }
      setSearchQuery('');
      setIsSearchFocused(false);
  };

  const handleBellClick = useCallback(() => {
      const message = performanceMessages[currentMessageIndex];
      addToast(message, 'info');
      currentMessageIndex = (currentMessageIndex + 1) % performanceMessages.length;
  }, [addToast]);

  const renderContent = () => {
    // Guest mode restrictions
    if (isGuestMode) {
        const allowedViews: View[] = ['home', 'generalDashboard', 'dashboard', 'history', 'palletsDashboard', 'palletHistory', 'ocorrenciasDashboard', 'ocorrenciaHistory'];
        if (!allowedViews.includes(activeView)) {
            return <Home currentUser={currentUser} setActiveView={setActiveView} isGuestMode={isGuestMode} />;
        }
    }

    switch (activeView) {
      case 'home': return <Home currentUser={currentUser} setActiveView={setActiveView} isGuestMode={isGuestMode}/>;
      case 'generalDashboard': return <GeneralDashboard transactions={transactions} palletTransactions={palletTransactions} setActiveView={setActiveView} />;
      case 'dashboard': return <Dashboard 
                                transactions={transactions} 
                                setActiveView={setActiveView}
                                onFiltersChange={setTransactionFilters} 
                             />;
      case 'add': return <TransactionForm onSave={addTransaction} addToast={addToast} currentBalance={currentBalance} />;
      case 'history': return <TransactionTable 
                                transactions={sortedTransactions} 
                                onEdit={setEditingTransaction} 
                                onDelete={deleteTransaction} 
                                isGuestMode={isGuestMode}
                                filters={transactionFilters}
                                onFiltersChange={setTransactionFilters}
                             />;
      case 'palletsDashboard': return <PalletDashboard 
                                        transactions={palletTransactions}
                                        setActiveView={setActiveView}
                                        onFiltersChange={setPalletFilters}
                                    />;
      case 'addPallet': return <PalletForm onSave={addPalletTransaction} addToast={addToast} />;
      case 'palletHistory': return <PalletTable 
                                        transactions={sortedPalletTransactions} 
                                        onEdit={setEditingPalletTransaction} 
                                        onDelete={deletePalletTransaction} 
                                        isGuestMode={isGuestMode}
                                        filters={palletFilters}
                                        onFiltersChange={setPalletFilters}
                                    />;
      case 'ocorrenciasDashboard': return <OcorrenciaDashboard ocorrencias={ocorrencias} setActiveView={setActiveView} onFiltersChange={setOcorrenciaFilters} />;
      case 'addOcorrencia': return <OcorrenciaForm onSave={addOcorrencia} addToast={addToast} />;
      case 'ocorrenciaHistory': return <OcorrenciaTable
                                        ocorrencias={sortedOcorrencias}
                                        onEdit={setEditingOcorrencia}
                                        onDelete={deleteOcorrencia}
                                        isGuestMode={isGuestMode}
                                        filters={ocorrenciaFilters}
                                        onFiltersChange={setOcorrenciaFilters}
                                    />;
      case 'settings': return <Settings users={users} onAddUser={addUser} onEdit={setEditingUser} onDelete={deleteUser} addToast={addToast} />;
      case 'liveChat': return (
        <LiveChat
          addToast={addToast}
          addTransaction={addTransaction}
          addPalletTransaction={addPalletTransaction}
          deleteTransaction={deleteTransaction}
          deletePalletTransaction={deletePalletTransaction}
          clearAllStretchFilmTransactions={clearAllStretchFilmTransactions} // New prop
          clearAllPalletTransactions={clearAllPalletTransactions} // New prop
          users={users} // Pass users to LiveChat
          onAddUser={addUser} // Pass addUser to LiveChat
          onDeleteUser={deleteUser} // Pass deleteUser to LiveChat
        />
      ); // Pass new functions to LiveChat
      default: return null;
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} users={users} addToast={addToast} />;
  }

  return (
    <div className="flex h-screen text-slate-300 overflow-hidden">
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        toggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={handleLogout}
        isGuestMode={isGuestMode}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[calc(100%-6rem)] ml-24' : 'w-[calc(100%-18rem)] ml-72'}`}>
          <header className="flex items-center justify-between p-4 sm:p-6 lg:p-8">
              <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
                    {viewTitles[activeView]}
                  </h1>
              </div>
              <div className="flex items-center gap-4">
                  <div ref={searchContainerRef} className="relative">
                      <div className="relative w-64">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input 
                              type="text" 
                              placeholder="Search..." 
                              className="w-full pl-10 pr-10 py-2 rounded-full bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onFocus={() => setIsSearchFocused(true)}
                          />
                           {searchQuery && (
                              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200">
                                  <XIcon className="h-4 w-4" />
                              </button>
                          )}
                      </div>
                      {isSearchFocused && searchQuery && (
                        <SearchResults
                            results={searchResults}
                            query={searchQuery}
                            onResultClick={handleSearchResultClick}
                        />
                      )}
                  </div>
                  <button onClick={handleBellClick} className="p-2 rounded-full hover:bg-slate-800" title="Verificar status do sistema">
                      <BellIcon className="h-6 w-6 text-slate-400" />
                  </button>
                  {!isGuestMode && (
                    <button onClick={() => setIsShareModalOpen(true)} className="p-2 rounded-full hover:bg-slate-800" title="Compartilhar Sistema">
                        <ShareIcon className="h-6 w-6 text-slate-400" />
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                       {currentUser && (
                         <>
                            <img src={currentUser.profilePicture} alt={currentUser.name} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                                <p className="font-semibold text-sm text-slate-100">{currentUser.name}</p>
                                <p className="text-xs text-slate-400">{currentUser.role}</p>
                            </div>
                         </>
                       )}
                  </div>
              </div>
          </header>
        <main className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 lg:p-8 pt-0">
            <div key={activeView} className="animate-fadeInSlideUp">
                {renderContent()}
            </div>
        </main>
      </div>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        shareToken={SHARE_TOKEN}
        addToast={addToast}
        activeView={activeView}
        transactionFilters={transactionFilters}
        palletFilters={palletFilters}
      />

      {editingTransaction && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="relative bg-slate-800 rounded-3xl shadow-xl w-full max-w-4xl animate-scaleIn">
                <TransactionForm
                    initialData={editingTransaction}
                    onSave={(data) => updateTransaction({ ...data, id: editingTransaction.id, balance: 0, unitKg: 0})}
                    isEditMode
                    addToast={addToast}
                    currentBalance={currentBalance}
                />
                <button onClick={() => setEditingTransaction(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-200 p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
      )}
      
      {editingPalletTransaction && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="relative bg-slate-800 rounded-3xl shadow-xl w-full max-w-6xl animate-scaleIn">
                <PalletForm
                    initialData={editingPalletTransaction}
                    onSave={(data) => updatePalletTransaction({ ...data, id: editingPalletTransaction.id, month: '', duration: ''})}
                    isEditMode
                    addToast={addToast}
                />
                 <button onClick={() => setEditingPalletTransaction(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-200 p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
      )}

      {editingOcorrencia && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="relative bg-slate-800 rounded-3xl shadow-xl w-full max-w-6xl animate-scaleIn">
                <OcorrenciaForm
                    initialData={editingOcorrencia}
                    onSave={(data) => updateOcorrencia({ ...data, id: editingOcorrencia.id })}
                    isEditMode
                    addToast={addToast}
                />
                 <button onClick={() => setEditingOcorrencia(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-200 p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="relative bg-slate-800 rounded-3xl shadow-xl w-full max-w-md p-8 animate-scaleIn">
                <h2 className="text-xl font-semibold text-slate-100 mb-6">Editar Usuário</h2>
                {/* Simplified User Edit Form */}
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const updatedUser = {
                        ...editingUser,
                        name: formData.get('name') as string,
                        role: formData.get('role') as string,
                    };
                    updateUser(updatedUser);
                }}>
                    <div className="space-y-4">
                        <div>
                          <label htmlFor="edit-name" className="block mb-2 text-sm font-medium text-slate-300">Nome</label>
                          <Input id="edit-name" name="name" defaultValue={editingUser.name} required />
                        </div>
                        <div>
                          <label htmlFor="edit-role" className="block mb-2 text-sm font-medium text-slate-300">Perfil</label>
                          <Input id="edit-role" name="role" defaultValue={editingUser.role} required />
                        </div>
                        <p className="text-xs text-slate-500">A foto e a senha não podem ser editadas aqui.</p>
                        <Button type="submit" className="w-full">Salvar Alterações</Button>
                    </div>
                </form>
                 <button onClick={() => setEditingUser(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-200 p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;