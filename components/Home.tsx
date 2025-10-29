import React from 'react';
import { User, View } from '../types';
import { ChartPieIcon, PalletIcon, MicrophoneIcon, CogIcon } from './Icons';

interface HomeProps {
  currentUser: User | null;
  setActiveView: (view: View) => void;
  isGuestMode: boolean;
}

interface NavCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  colorClass: string;
}

const NavCard: React.FC<NavCardProps> = ({ title, description, icon, onClick, colorClass }) => (
  <button
    onClick={onClick}
    className={`group relative flex flex-col justify-between p-6 bg-slate-900/50 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-2 overflow-hidden border border-slate-700`}
  >
    <div className={`absolute top-0 right-0 h-24 w-24 ${colorClass} opacity-20 rounded-bl-full transition-all duration-300 group-hover:opacity-30 group-hover:scale-150`}></div>
    <div className="relative z-10">
      <div className={`p-3 rounded-xl inline-block ${colorClass}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-bold text-slate-100">{title}</h3>
      <p className="mt-2 text-slate-400">{description}</p>
    </div>
    <div className="relative z-10 text-right mt-4">
        <span className="text-sm font-semibold text-primary-500 group-hover:underline">Acessar Módulo →</span>
    </div>
  </button>
);

const Home: React.FC<HomeProps> = ({ currentUser, setActiveView, isGuestMode }) => {
  const firstName = currentUser?.name.split(' ')[0];

  return (
    <div className="bg-slate-800 p-8 rounded-3xl shadow-xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-100">
          {isGuestMode ? 'Bem-vindo ao Sistema' : `Bem-vindo de volta, ${firstName}!`}
        </h1>
        <p className="mt-2 text-lg text-slate-400">
          {isGuestMode ? 'Você está em modo de visualização. Navegue pelos módulos para ver os dados.' : 'Selecione um módulo abaixo para começar.'}
        </p>
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isGuestMode ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-8`}>
        <NavCard
          title="Filme Stretch"
          description="Acesse o dashboard, adicione e gerencie o histórico de movimentações."
          icon={<ChartPieIcon className="h-8 w-8 text-white" />}
          onClick={() => setActiveView('dashboard')}
          colorClass="bg-primary-500"
        />
        <NavCard
          title="Paletes"
          description="Visualize o dashboard de paletes e controle as movimentações."
          icon={<PalletIcon className="h-8 w-8 text-white" />}
          onClick={() => setActiveView('palletsDashboard')}
          colorClass="bg-accent-success"
        />
        {!isGuestMode && (
            <>
                <NavCard
                title="Verônica AI"
                description="Converse com a assistente de voz para gerenciar tarefas rapidamente."
                icon={<MicrophoneIcon className="h-8 w-8 text-white" />}
                onClick={() => setActiveView('liveChat')}
                colorClass="bg-accent-info"
                />
                <NavCard
                title="Configurações"
                description="Gerencie usuários e outras configurações gerais do sistema."
                icon={<CogIcon className="h-8 w-8 text-white" />}
                onClick={() => setActiveView('settings')}
                colorClass="bg-accent-warning"
                />
            </>
        )}
      </div>
    </div>
  );
};

export default Home;