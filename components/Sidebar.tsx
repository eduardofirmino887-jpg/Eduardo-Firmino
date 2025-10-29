
import React from 'react';
import { View } from '../types';
import { ChartPieIcon, PlusCircleIcon, DocumentTextIcon, ChevronLeftIcon, PalletIcon, CogIcon, LogoutIcon, MicrophoneIcon, HomeIcon, ExclamationCircleIcon } from './Icons'; // Removed ImageStackIcon, MapPinIcon, FilmIcon, PaperclipIcon

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  activeView: View;
  setActiveView: (view: View) => void;
  onLogout: () => void;
  isGuestMode: boolean;
}

const mainNavItems: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Início', icon: <HomeIcon className="h-6 w-6" /> },
  { id: 'generalDashboard', label: 'Dashboard Geral', icon: <ChartPieIcon className="h-6 w-6" /> },
];

const filmNavItems: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard Resumo', icon: <ChartPieIcon className="h-6 w-6" /> },
  { id: 'add', label: 'Adicionar Mov.', icon: <PlusCircleIcon className="h-6 w-6" /> },
  { id: 'history', label: 'Histórico', icon: <DocumentTextIcon className="h-6 w-6" /> },
];

const palletNavItems: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'palletsDashboard', label: 'Dashboard Paletes', icon: <PalletIcon className="h-6 w-6" /> },
  { id: 'addPallet', label: 'Adicionar Mov.', icon: <PlusCircleIcon className="h-6 w-6" /> },
  { id: 'palletHistory', label: 'Histórico Paletes', icon: <DocumentTextIcon className="h-6 w-6" /> },
];

const ocorrenciaNavItems: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'ocorrenciasDashboard', label: 'Dashboard Ocorrências', icon: <ExclamationCircleIcon className="h-6 w-6" /> },
  { id: 'addOcorrencia', label: 'Adicionar Ocorrência', icon: <PlusCircleIcon className="h-6 w-6" /> },
  { id: 'ocorrenciaHistory', label: 'Histórico Ocorrências', icon: <DocumentTextIcon className="h-6 w-6" /> },
];

const genaiNavItems: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'liveChat', label: 'Chat de Voz', icon: <MicrophoneIcon className="h-6 w-6" /> },
];

const settingsNavItems: { id: View | string; label: string; icon: React.ReactNode }[] = [
    { id: 'settings', label: 'Configurações', icon: <CogIcon className="h-6 w-6" /> },
    { id: 'logout', label: 'Logout', icon: <LogoutIcon className="h-6 w-6" /> },
]

const NavList: React.FC<{
    items: { id: View | string; label: string; icon: React.ReactNode }[],
    activeView: View,
    onItemClick: (id: View | string) => void,
    isCollapsed: boolean
}> = ({ items, activeView, onItemClick, isCollapsed }) => (
    <ul>
        {items.map((item) => (
            <li key={item.id} className="my-1">
                <button
                    onClick={() => onItemClick(item.id)}
                    className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                        activeView === item.id
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white transform hover:translate-x-1'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : ''}
                >
                    {item.icon}
                    {!isCollapsed && <span className="ml-4 font-medium text-base">{item.label}</span>}
                </button>
            </li>
        ))}
    </ul>
);


const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse, activeView, setActiveView, onLogout, isGuestMode }) => {
  
  const handleNavItemClick = (id: View | string) => {
    if (id === 'logout') {
        onLogout();
    } else {
        setActiveView(id as View);
    }
  };

  const filteredMainNav = mainNavItems;
  const filteredFilmNav = isGuestMode ? filmNavItems.filter(item => item.id !== 'add') : filmNavItems;
  const filteredPalletNav = isGuestMode ? palletNavItems.filter(item => item.id !== 'addPallet') : palletNavItems;
  const filteredOcorrenciaNav = isGuestMode ? ocorrenciaNavItems.filter(item => item.id !== 'addOcorrencia') : ocorrenciaNavItems;
  const filteredSettingsNav = settingsNavItems.filter(item => isGuestMode ? item.id === 'logout' : true);
  
  return (
    <aside className={`fixed top-0 left-0 h-full bg-slate-800 border-r border-slate-700 flex flex-col z-20 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-24' : 'w-72'}`}>
      <div className={`flex items-center p-4 border-b border-slate-700 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
            <div className="flex items-center">
                <div className="bg-primary-600 p-2 rounded-lg">
                    <DocumentTextIcon className="h-6 w-6 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold text-slate-100">
                    Logística
                </span>
            </div>
        )}
         {isCollapsed && <div className="bg-primary-600 p-2 rounded-lg"><DocumentTextIcon className="h-6 w-6 text-white" /></div>}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          <div>
              <h3 className={`px-3 mb-2 text-sm font-semibold tracking-wider text-slate-400 uppercase ${isCollapsed ? 'text-center' : ''}`}>
                  {isCollapsed ? 'Gn' : 'Geral'}
              </h3>
              <NavList items={filteredMainNav} activeView={activeView} onItemClick={handleNavItemClick} isCollapsed={isCollapsed} />
          </div>
          <div>
              <h3 className={`px-3 mb-2 text-sm font-semibold tracking-wider text-slate-400 uppercase ${isCollapsed ? 'text-center' : ''}`}>
                  {isCollapsed ? 'St' : 'Filme Stretch'}
              </h3>
              <NavList items={filteredFilmNav} activeView={activeView} onItemClick={handleNavItemClick} isCollapsed={isCollapsed} />
          </div>
          
          <div>
              <h3 className={`px-3 mb-2 text-sm font-semibold tracking-wider text-slate-400 uppercase ${isCollapsed ? 'text-center' : ''}`}>
                  {isCollapsed ? 'Plt' : 'Paletes'}
              </h3>
              <NavList items={filteredPalletNav} activeView={activeView} onItemClick={handleNavItemClick} isCollapsed={isCollapsed} />
          </div>

          <div>
              <h3 className={`px-3 mb-2 text-sm font-semibold tracking-wider text-slate-400 uppercase ${isCollapsed ? 'text-center' : ''}`}>
                  {isCollapsed ? 'Oco' : 'Ocorrências'}
              </h3>
              <NavList items={filteredOcorrenciaNav} activeView={activeView} onItemClick={handleNavItemClick} isCollapsed={isCollapsed} />
          </div>

          {!isGuestMode && (
            <div>
                <h3 className={`px-3 mb-2 text-sm font-semibold tracking-wider text-slate-400 uppercase ${isCollapsed ? 'text-center' : ''}`}>
                    {isCollapsed ? 'AI' : 'Verônica AI'}
                </h3>
                <NavList items={genaiNavItems} activeView={activeView} onItemClick={handleNavItemClick} isCollapsed={isCollapsed} />
            </div>
          )}
      </nav>
      
      <div className="px-4 py-4 border-t border-slate-700">
         <NavList 
            items={filteredSettingsNav} 
            activeView={activeView} 
            onItemClick={handleNavItemClick} 
            isCollapsed={isCollapsed} 
        />
         <button
          onClick={toggleCollapse}
          className="absolute -right-4 top-8 p-1.5 rounded-full bg-slate-700 border border-slate-600 text-slate-300 shadow-md"
          aria-label="Toggle Sidebar"
        >
          <ChevronLeftIcon className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
