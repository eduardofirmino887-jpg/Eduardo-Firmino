
import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { User } from '../types';
import { DocumentTextIcon, UserIcon, LockClosedIcon, LinkIcon, ChevronDownIcon } from './Icons';

interface LoginPageProps {
  onLogin: (userName: string, pass: string) => boolean;
  users: User[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users, addToast }) => {
  const [selectedUser, setSelectedUser] = useState(users.length > 0 ? users[0].name : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (users.length > 0 && !users.some(u => u.name === selectedUser)) {
      setSelectedUser(users[0].name);
    }
  }, [users, selectedUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedUser) {
        setError('Por favor, selecione um usuário.');
        return;
    }
    const success = onLogin(selectedUser, password);
    if (!success) {
      setError('Usuário ou senha inválidos.');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        addToast('Link copiado para a área de transferência!', 'info');
    }).catch(err => {
        addToast('Falha ao copiar o link.', 'error');
        console.error('Could not copy text: ', err);
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-primary-950 font-sans p-4">
      <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/80 to-slate-900"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/gplay.png')] opacity-5"></div>

      <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl">
        <div className="text-center">
            <div className="flex justify-center mb-4">
                <div className="bg-primary-600 p-3 rounded-xl inline-block shadow-lg shadow-primary-600/30">
                    <DocumentTextIcon className="h-8 w-8 text-white" />
                </div>
            </div>
          <h1 className="text-3xl font-bold text-white">
            Bem-vindo de Volta
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Faça login para acessar a Logmam Transportes.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div className="relative">
                    <label htmlFor="user-select" className="sr-only">
                        Usuário
                    </label>
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    <Select
                        id="user-select"
                        name="user"
                        required
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="pl-10 !bg-slate-900/50 !border-slate-700 text-white focus:!ring-primary-500 appearance-none"
                    >
                        <option value="" disabled className="bg-slate-800">Selecione um usuário</option>
                        {users.map(user => (
                            <option key={user.id} value={user.name} className="bg-slate-800">{user.name}</option>
                        ))}
                    </Select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                    <label htmlFor="password-input" className="sr-only">
                        Senha
                    </label>
                    <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                        id="password-input"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Senha"
                        className="pl-10 !bg-slate-900/50 !border-slate-700 text-white focus:!ring-primary-500"
                    />
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <div>
                <Button 
                    type="submit" 
                    className="w-full !bg-primary-600 hover:!bg-primary-700 focus:!ring-primary-500"
                >
                    Entrar no Sistema
                </Button>
            </div>
        </form>

        <div className="text-center">
            <button 
                onClick={handleShare}
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary-400 transition-colors"
            >
                <LinkIcon className="h-4 w-4" />
                Compartilhar para visualização
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
