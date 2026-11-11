import React, { useEffect, useState } from 'react';
import { Building2, History, LogOut, Mail, Trash2, UserPlus, Users } from 'lucide-react';
import { Session } from '../../platform/useSession';
import { Member, PAYS, ROLE_LABELS, SECTEURS } from '../../platform/types';
import { formatJournalDate } from './format';

export type SettingsTab = 'espace' | 'equipe' | 'journal';

interface Props {
  session: Session;
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'block text-xs font-bold text-slate-600 mb-1.5';
const cardClass = 'bg-white rounded-2xl border border-slate-100 shadow-sm p-5';

export default function Parametres({ session, tab, onTabChange }: Props) {
  const { isAdmin } = session;
  const tabs = [
    { id: 'espace' as const, label: 'Espace', icon: Building2, visible: true },
    { id: 'equipe' as const, label: 'Équipe', icon: Users, visible: true },
    { id: 'journal' as const, label: 'Journal', icon: History, visible: isAdmin },
  ].filter((t) => t.visible);
  const current = tabs.some((t) => t.id === tab) ? tab : 'espace';

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                current === t.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {current === 'espace' && <EspaceTab session={session} />}
      {current === 'equipe' && <EquipeTab session={session} />}
      {current === 'journal' && <JournalTab session={session} />}
    </div>
  );
}

function EspaceTab({ session }: { session: Session }) {
  const { organisation, isAdmin, role } = session;
  const [form, setForm] = useState(organisation);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setForm(organisation);
    setStatus('idle');
  }, [organisation?.id]);

  if (!organisation || !form) return null;

  const dirty =
    (['nom', 'type', 'secteur', 'pays', 'ville', 'devise', 'langue', 'whatsapp'] as const).some((k) => form[k] !== organisation[k]) ||
    form.modules.gestionMultiService !== organisation.modules.gestionMultiService;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nom.trim().length < 2) return;
    setStatus('saving');
    try {
      await session.updateOrganisation({
        nom: form.nom.trim(),
        type: form.type,
        secteur: form.secteur,
        pays: form.pays,
        ville: form.ville.trim(),
        devise: form.devise,
        langue: form.langue,
        whatsapp: form.whatsapp.trim(),
        modules: form.modules,
      });
      setStatus('saved');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const leave = async () => {
    if (!window.confirm(`Quitter l'espace « ${organisation.nom} » ? Vous n'y aurez plus accès.`)) return;
    try {
      await session.leaveOrganisation();
    } catch (err) {
      console.error(err);
      alert("Impossible de quitter l'espace pour le moment.");
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={save} className={`${cardClass} space-y-4`}>
        <h3 className="text-sm font-black text-slate-800">Informations de l'espace</h3>
        {!isAdmin && <p className="text-xs text-slate-500">Seuls les administrateurs peuvent modifier ces informations.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="set-nom">Nom</label>
            <input id="set-nom" className={inputClass} disabled={!isAdmin} maxLength={80} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="set-type">Type</label>
            <select id="set-type" className={inputClass} disabled={!isAdmin} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'commerce' | 'agence' })}>
              <option value="commerce">Commerce</option>
              <option value="agence">Agence</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="set-secteur">Secteur</label>
            <select id="set-secteur" className={inputClass} disabled={!isAdmin} value={form.secteur} onChange={(e) => setForm({ ...form, secteur: e.target.value })}>
              {SECTEURS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="set-whatsapp">WhatsApp des commandes</label>
            <input id="set-whatsapp" className={inputClass} disabled={!isAdmin} maxLength={20} inputMode="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="set-pays">Pays</label>
            <select
              id="set-pays"
              className={inputClass}
              disabled={!isAdmin}
              value={form.pays}
              onChange={(e) => {
                const pays = PAYS.find((p) => p.nom === e.target.value);
                setForm({ ...form, pays: e.target.value, devise: pays?.devise ?? form.devise });
              }}
            >
              {PAYS.map((p) => (
                <option key={p.nom}>{p.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="set-ville">Ville</label>
            <input id="set-ville" className={inputClass} disabled={!isAdmin} maxLength={60} value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="set-langue">Langue</label>
            <select id="set-langue" className={inputClass} disabled={!isAdmin} value={form.langue} onChange={(e) => setForm({ ...form, langue: e.target.value as 'fr' | 'en' })}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Devise</label>
            <input className={inputClass} disabled value={form.devise === 'XAF' || form.devise === 'XOF' ? `FCFA (${form.devise})` : form.devise} />
          </div>
        </div>

        <label className="flex gap-3 items-start bg-slate-50 rounded-xl p-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            disabled={!isAdmin}
            checked={form.modules.gestionMultiService}
            onChange={(e) => setForm({ ...form, modules: { ...form.modules, gestionMultiService: e.target.checked } })}
          />
          <span>
            <span className="text-sm font-bold text-slate-800">Gestion de stock et de caisse</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Secrétariat, Mobile Money et boissons. Désactiver masque le module sans supprimer ses données.
            </span>
          </span>
        </label>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!dirty || status === 'saving'}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold cursor-pointer"
            >
              {status === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {status === 'saved' && !dirty && <span className="text-sm text-emerald-600 font-medium">Modifications enregistrées</span>}
            {status === 'error' && <span className="text-sm text-rose-600 font-medium">Échec de l'enregistrement, réessayez.</span>}
          </div>
        )}
      </form>

      <div className={cardClass}>
        <h3 className="text-sm font-black text-slate-800">Offre</h3>
        <p className="text-sm text-slate-500 mt-1">
          Offre actuelle : <strong className="text-slate-800 capitalize">{organisation.plan === 'free' ? 'Gratuite' : organisation.plan}</strong>. Les abonnements
          payants ne sont pas encore ouverts.
        </p>
      </div>

      {role && role !== 'owner' && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-slate-800">Quitter cet espace</h3>
          <p className="text-sm text-slate-500 mt-1">Vous perdrez l'accès à ses données. Un administrateur pourra vous réinviter.</p>
          <button onClick={leave} className="mt-3 px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer">
            <LogOut size={15} /> Quitter l'espace
          </button>
        </div>
      )}
    </div>
  );
}

function EquipeTab({ session }: { session: Session }) {
  const { members, orgInvitations, isAdmin, user } = session;
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await session.inviteMember(email, inviteRole);
      setEmail('');
    } catch (err: any) {
      setError(err?.message?.startsWith('{') || !err?.message ? "L'invitation n'a pas pu être envoyée." : err.message);
    } finally {
      setBusy(false);
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setError("L'action a échoué. Vérifiez vos droits et votre connexion.");
    }
  };

  const remove = (m: Member) => {
    if (!window.confirm(`Retirer ${m.email} de l'équipe ?`)) return;
    run(() => session.removeMember(m));
  };

  return (
    <div className="space-y-5">
      {isAdmin && (
        <form onSubmit={invite} className={cardClass}>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <UserPlus size={16} className="text-blue-600" /> Inviter un collaborateur
          </h3>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              className={inputClass}
              placeholder="adresse@gmail.com"
              aria-label="Adresse e-mail du collaborateur"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select className={`${inputClass} sm:w-48`} aria-label="Rôle" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}>
              <option value="member">Collaborateur</option>
              <option value="admin">Administrateur</option>
            </select>
            <button type="submit" disabled={busy} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold cursor-pointer shrink-0">
              Inviter
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Aucun e-mail n'est envoyé : la personne voit l'invitation en se connectant avec ce compte Google. Un collaborateur saisit les opérations ; un
            administrateur gère aussi l'équipe, les paramètres et les suppressions.
          </p>
        </form>
      )}

      {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

      <div className={cardClass}>
        <h3 className="text-sm font-black text-slate-800">Membres ({members.length})</h3>
        <ul className="mt-3 divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.uid} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {m.displayName || m.email} {m.uid === user?.uid && <span className="text-xs font-medium text-slate-400">(vous)</span>}
                </p>
                <p className="text-xs text-slate-500 truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && m.role !== 'owner' && m.uid !== user?.uid ? (
                  <>
                    <select
                      aria-label={`Rôle de ${m.email}`}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700"
                      value={m.role}
                      onChange={(e) => run(() => session.changeMemberRole(m, e.target.value as 'admin' | 'member'))}
                    >
                      <option value="member">Collaborateur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                    <button onClick={() => remove(m)} title="Retirer de l'équipe" className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer">
                      <Trash2 size={15} />
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 rounded-lg px-2 py-1">{ROLE_LABELS[m.role]}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isAdmin && orgInvitations.length > 0 && (
        <div className={cardClass}>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Mail size={16} className="text-slate-400" /> Invitations en attente ({orgInvitations.length})
          </h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {orgInvitations.map((inv) => (
              <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{inv.email}</p>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[inv.role]}</p>
                </div>
                <button onClick={() => run(() => session.cancelInvitation(inv))} className="text-xs font-bold text-slate-500 hover:text-rose-600 cursor-pointer">
                  Annuler
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function JournalTab({ session }: { session: Session }) {
  const { journal } = session;
  return (
    <div className={cardClass}>
      <h3 className="text-sm font-black text-slate-800">Journal d'activité</h3>
      <p className="text-xs text-slate-500 mt-1">Les 100 dernières actions sensibles de l'espace. Les entrées ne peuvent être ni modifiées ni supprimées.</p>
      {journal.length === 0 ? (
        <p className="text-sm text-slate-400 mt-4">Aucune activité enregistrée pour l'instant.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {journal.map((j) => (
            <li key={j.id} className="py-2.5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-4">
              <p className="text-sm text-slate-700">{j.description}</p>
              <p className="text-xs text-slate-400 shrink-0">
                {j.acteur} · {formatJournalDate(j.date)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
