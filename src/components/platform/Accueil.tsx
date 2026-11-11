import React from 'react';
import { CheckCircle2, Circle, History, MapPin, MessageCircle, Package, Users } from 'lucide-react';
import { Session } from '../../platform/useSession';
import { ROLE_LABELS } from '../../platform/types';
import { formatJournalDate } from './format';

interface Props {
  session: Session;
  onOpenSettings: (tab: 'espace' | 'equipe' | 'journal') => void;
  onOpenGestion: () => void;
}

export default function Accueil({ session, onOpenSettings, onOpenGestion }: Props) {
  const { organisation, role, isAdmin, members, orgInvitations, journal, user } = session;
  if (!organisation) return null;

  const etapes = [
    { fait: true, label: 'Créer votre espace', action: undefined as undefined | (() => void) },
    {
      fait: !!organisation.ville && !!organisation.whatsapp,
      label: 'Renseigner la ville et le numéro WhatsApp des commandes',
      action: isAdmin ? () => onOpenSettings('espace') : undefined,
    },
    {
      fait: members.length + orgInvitations.length > 1,
      label: 'Inviter un collaborateur',
      action: isAdmin ? () => onOpenSettings('equipe') : undefined,
    },
  ];
  const restant = etapes.filter((e) => !e.fait).length;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          {organisation.type === 'agence' ? 'Agence' : 'Commerce'} · {organisation.secteur}
        </p>
        <h2 className="text-xl font-black text-slate-800 mt-1">{organisation.nom}</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} /> {[organisation.ville, organisation.pays].filter(Boolean).join(', ')}
          </span>
          {organisation.whatsapp && (
            <span className="flex items-center gap-1.5">
              <MessageCircle size={14} /> {organisation.whatsapp}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users size={14} /> {members.length} membre{members.length > 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Connecté(e) : {user?.email} · {role ? ROLE_LABELS[role] : '…'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-black text-slate-800">
            {restant === 0 ? 'Votre espace est prêt' : `Mise en route · ${restant} étape${restant > 1 ? 's' : ''} restante${restant > 1 ? 's' : ''}`}
          </h3>
          <ul className="mt-3 space-y-2.5">
            {etapes.map((e) => (
              <li key={e.label} className="flex items-start gap-2.5 text-sm">
                {e.fait ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle size={18} className="text-slate-300 shrink-0 mt-0.5" />
                )}
                <span className={e.fait ? 'text-slate-400 line-through' : 'text-slate-700'}>
                  {e.label}
                  {!e.fait && e.action && (
                    <button onClick={e.action} className="ml-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                      Faire
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {organisation.modules.gestionMultiService && (
            <button
              onClick={onOpenGestion}
              className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Package size={16} /> Ouvrir la gestion de stock et de caisse
            </button>
          )}
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <History size={16} className="text-slate-400" /> Activité récente
              </h3>
              <button onClick={() => onOpenSettings('journal')} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                Tout voir
              </button>
            </div>
            {journal.length === 0 ? (
              <p className="text-sm text-slate-400 mt-3">Aucune activité enregistrée pour l'instant.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {journal.slice(0, 5).map((j) => (
                  <li key={j.id} className="text-sm">
                    <p className="text-slate-700">{j.description}</p>
                    <p className="text-xs text-slate-400">
                      {j.acteur} · {formatJournalDate(j.date)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
