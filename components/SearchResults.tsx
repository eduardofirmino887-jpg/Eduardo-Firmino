
import React from 'react';
import { Transaction, PalletTransaction, User, Ocorrencia } from '../types';
import { FilmIcon, PalletIcon, UserIcon, ExclamationCircleIcon } from './Icons';

interface SearchResultsProps {
  results: {
    transactions: Transaction[];
    palletTransactions: PalletTransaction[];
    users: User[];
    ocorrencias: Ocorrencia[];
  };
  query: string;
  onResultClick: (type: 'transaction' | 'pallet' | 'user' | 'ocorrencia', id: string) => void;
}

const Highlight: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim() || !text) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong key={i} className="text-primary-500 font-bold bg-primary-500/20 rounded">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </span>
  );
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, query, onResultClick }) => {
  const hasResults = results.transactions.length > 0 || results.palletTransactions.length > 0 || results.users.length > 0 || results.ocorrencias.length > 0;

  return (
    <div className="absolute top-full mt-2 w-96 max-h-96 overflow-y-auto bg-slate-800 rounded-xl shadow-lg z-50 border border-slate-700">
      <div className="p-2">
        {hasResults ? (
          <>
            {results.transactions.length > 0 && (
              <section className="mb-2">
                <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Filme Stretch</h3>
                <ul>
                  {results.transactions.map(t => (
                    <li key={t.id}>
                      <button onClick={() => onResultClick('transaction', t.id)} className="w-full text-left p-3 flex items-start gap-3 rounded-lg hover:bg-slate-700 transition-colors">
                        <div className="p-1.5 bg-slate-700 rounded-md mt-1"><FilmIcon className="w-4 h-4 text-slate-400" /></div>
                        <div>
                            <p className="text-sm font-medium text-slate-100">
                                {t.operation} - {formatDate(t.date)}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                               <Highlight text={t.observations || t.invoice} highlight={query} />
                            </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {results.palletTransactions.length > 0 && (
              <section className="mb-2">
                <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Paletes</h3>
                <ul>
                  {results.palletTransactions.map(p => (
                    <li key={p.id}>
                      <button onClick={() => onResultClick('pallet', p.id)} className="w-full text-left p-3 flex items-start gap-3 rounded-lg hover:bg-slate-700 transition-colors">
                        <div className="p-1.5 bg-slate-700 rounded-md mt-1"><PalletIcon className="w-4 h-4 text-slate-400" /></div>
                        <div>
                             <p className="text-sm font-medium text-slate-100">
                                <Highlight text={`${p.client} - ${p.plate}`} highlight={query} />
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                                <Highlight text={p.driver || p.origin} highlight={query} />
                            </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
             {results.ocorrencias.length > 0 && (
              <section className="mb-2">
                <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ocorrências</h3>
                <ul>
                  {results.ocorrencias.map(o => (
                    <li key={o.id}>
                      <button onClick={() => onResultClick('ocorrencia', o.id)} className="w-full text-left p-3 flex items-start gap-3 rounded-lg hover:bg-slate-700 transition-colors">
                        <div className="p-1.5 bg-slate-700 rounded-md mt-1"><ExclamationCircleIcon className="w-4 h-4 text-slate-400" /></div>
                        <div>
                             <p className="text-sm font-medium text-slate-100">
                                <Highlight text={`${o.client} - ${o.plate}`} highlight={query} />
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                                <Highlight text={o.monitoringReason} highlight={query} />
                            </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {results.users.length > 0 && (
              <section>
                <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuários</h3>
                <ul>
                  {results.users.map(u => (
                    <li key={u.id}>
                      <button onClick={() => onResultClick('user', u.id)} className="w-full text-left p-3 flex items-center gap-3 rounded-lg hover:bg-slate-700 transition-colors">
                        <img src={u.profilePicture} alt={u.name} className="w-8 h-8 rounded-full" />
                        <div>
                            <p className="text-sm font-medium text-slate-100">
                                <Highlight text={u.name} highlight={query} />
                            </p>
                            <p className="text-xs text-slate-400">
                                <Highlight text={u.role} highlight={query} />
                            </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <div className="p-4 text-center text-sm text-slate-400">
            Nenhum resultado encontrado para "<span className='font-semibold text-slate-200'>{query}</span>".
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
