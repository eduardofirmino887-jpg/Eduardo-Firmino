import React, { useState, useCallback } from 'react';
import { User } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { UserIcon, PencilIcon, TrashIcon } from './Icons';
import Tooltip from './ui/Tooltip';

interface SettingsProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const Settings: React.FC<SettingsProps> = ({ users, onAddUser, onEdit, onDelete, addToast }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const base64 = await toBase64(file);
      setProfilePicture(base64);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !password) {
        addToast("Por favor, preencha todos os campos.", 'error');
        return;
    }
    onAddUser({
      name,
      role,
      password,
      profilePicture: profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=40&rounded=true`, // Fallback to UI-Avatars
    });
    // Reset form
    setName('');
    setPassword('');
    setRole('');
    setProfilePicture(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-xl h-full">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Cadastrar Novo Usuário</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center mb-4">
              <label htmlFor="photo-upload" className="cursor-pointer group relative">
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center ring-2 ring-offset-2 ring-offset-slate-800 ring-primary-500 overflow-hidden">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Prévia" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-slate-400" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-semibold">Alterar</span>
                </div>
              </label>
              <input type="file" id="photo-upload" className="hidden" accept="image/*" onChange={handlePhotoChange} />
            </div>
            <div>
              <label htmlFor="name" className="block mb-2 text-sm font-medium text-slate-300">Nome</label>
              <Input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: João Silva" />
            </div>
             <div>
              <label htmlFor="role" className="block mb-2 text-sm font-medium text-slate-300">Perfil</label>
              <Input type="text" id="role" value={role} onChange={(e) => setRole(e.target.value)} required placeholder="Ex: Admin, Operador" />
            </div>
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-slate-300">Senha</label>
              <Input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full !mt-6">Adicionar Usuário</Button>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-xl h-full">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Usuários Cadastrados</h2>
          <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {users.map(user => (
              <li key={user.id} className="flex items-center p-3 rounded-xl bg-slate-900/50 hover:bg-slate-700/50 transition-colors">
                <img src={user.profilePicture} alt={user.name} className="w-10 h-10 rounded-full object-cover mr-4" />
                <div className="flex-1">
                  <p className="font-semibold text-slate-100">{user.name}</p>
                  <p className="text-sm text-slate-400">{user.role}</p>
                </div>
                <div className="flex items-center space-x-1">
                   <Tooltip content="Editar">
                        <button onClick={() => onEdit(user)} className="p-2 text-slate-400 rounded-full hover:bg-slate-700 hover:text-primary-500 transition-all duration-200 transform hover:scale-125 active:scale-95">
                            <PencilIcon className="h-4 w-4" />
                        </button>
                   </Tooltip>
                   <Tooltip content="Excluir">
                        <button onClick={() => onDelete(user.id)} className="p-2 text-slate-400 rounded-full hover:bg-slate-700 hover:text-accent-error transition-all duration-200 transform hover:scale-125 active:scale-95">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                   </Tooltip>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Settings;