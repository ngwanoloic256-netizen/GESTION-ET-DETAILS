import React, { useState } from 'react';
import { Building2, Check, DatabaseBackup, LogOut, Mail, Store, Users } from 'lucide-react';
import { Session } from '../../platform/useSession';
import { NouvelleOrganisation, PAYS, ROLE_LABELS, SECTEURS } from '../../platform/types';
import { APP_NAME } from '../../config';

interface Props {
  session: Session;
  /** Vrai quand l'utilisateur a déjà un espace et en crée un autre. */
  additional?: boolean;
  onCancel?: () => void;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500';
const labelClass = 'block text-xs font-bold text-slate-600 mb-1.5';

export default function Onboarding({ session, additional = false, onCancel }: Props) {
  const { user, myInvitations, legacyCount } = session;
  const [form, setForm] = useState<NouvelleOrganisation>({
    nom: '',
    type: 'commerce',
    secteur: SECTEURS[0],
    pays: 'Cameroun',
    ville: '',
    devise: 'XAF',
    langue: 'fr',
    whatsapp: '',
    gestionMultiService: false,
  });
  const [importLegacy, setImportLegacy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offerLegacy = legacyCount > 0 && !additional;
  const set = <K extends keyof NouvelleOrganisation>(key: K, value: NouvelleOrganisation[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nom.trim().length < 2) {
      setError('Donnez un nom à votre espace (2 caractères minimum).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await session.createOrganisation(form, offerLegacy && importLegacy);
      onCancel?.();
    } catch (err: any) {
      console.error(err);
      setError("La création de l'espace a échoué. Vérifiez votre connexion puis réessayez.");
      setBusy(false);
    }
  };

  const accept = async (inv: (typeof myInvitations)[number]) => {
    setBusy(true);
    setError(null);
    try {
      await session.acceptInvitation(inv);
      onCancel?.();
    } catch (err) {
      console.error(err);
      setError("Impossible de rejoindre cet espace. L'invitation a peut-être été annulée.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {additional ? 'Nouvel espace' : `Bienvenue sur ${APP_NAME}`}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {additional
                ? 'Créez un espace séparé pour une autre boutique ou un autre client.'
                : 'Un espace regroupe votre commerce, votre équipe et vos données.'}
            </p>
          </div>
          {additional ? (
            <button onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
              Annuler
            </button>
          ) : (
            <button
              onClick={session.logout}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 cursor-pointer flex items-center gap-1.5"
              title={user?.email || ''}
            >
              <LogOut size={14} /> Se déconnecter
            </button>
          )}
        </div>

        {myInvitations.length > 0 && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Mail size={16} className="text-blue-600" /> Vous êtes invité(e)
            </h2>
            <div className="mt-3 space-y-2">
              {myInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{inv.orgName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {ROLE_LABELS[inv.role]} · invité(e) par {inv.invitedByName}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      disabled={busy}
                      onClick={() => session.declineInvitation(inv)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                    >
                      Refuser
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => accept(inv)}
                      className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      Rejoindre
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Building2 size={16} className="text-blue-600" /> Créer mon espace
          </h2>

          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'commerce', label: 'Commerce', hint: 'Je vends mes produits', icon: Store },
              { id: 'agence', label: 'Agence', hint: 'Je gère des clients', icon: Users },
            ] as const).map((opt) => {
              const Icon = opt.icon;
              const active = form.type === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => set('type', opt.id)}
                  className={`text-left p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
                  <p className="text-sm font-bold text-slate-800 mt-1.5">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.hint}</p>
                </button>
              );
            })}
          </div>

          <div>
            <label className={labelClass} htmlFor="org-nom">Nom du commerce ou de la marque</label>
            <input
              id="org-nom"
              className={inputClass}
              value={form.nom}
              maxLength={80}
              onChange={(e) => set('nom', e.target.value)}
              placeholder="Ex. Douala Sneakers"
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="org-secteur">Secteur d'activité</label>
            <select id="org-secteur" className={inputClass} value={form.secteur} onChange={(e) => set('secteur', e.target.value)}>
              {SECTEURS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="org-pays">Pays</label>
              <select
                id="org-pays"
                className={inputClass}
                value={form.pays}
                onChange={(e) => {
                  const pays = PAYS.find((p) => p.nom === e.target.value);
                  setForm((f) => ({ ...f, pays: e.target.value, devise: pays?.devise ?? f.devise }));
                }}
              >
                {PAYS.map((p) => (
                  <option key={p.nom}>{p.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="org-ville">Ville</label>
              <input id="org-ville" className={inputClass} value={form.ville} maxLength={60} onChange={(e) => set('ville', e.target.value)} placeholder="Ex. Douala" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="org-whatsapp">Numéro WhatsApp des commandes</label>
              <input
                id="org-whatsapp"
                className={inputClass}
                value={form.whatsapp}
                maxLength={20}
                inputMode="tel"
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="+237 6 XX XX XX XX"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="org-langue">Langue</label>
              <select id="org-langue" className={inputClass} value={form.langue} onChange={(e) => set('langue', e.target.value as 'fr' | 'en')}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {offerLegacy ? (
            <label className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={importLegacy} onChange={(e) => setImportLegacy(e.target.checked)} />
              <span>
                <span className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                  <DatabaseBackup size={14} /> Reprendre mes données existantes
                </span>
                <span className="block text-xs text-amber-800 mt-0.5">
                  {legacyCount} enregistrements (stock, ventes, Mobile Money) seront copiés dans cet espace. Les originaux ne sont pas supprimés.
                </span>
              </span>
            </label>
          ) : (
            <label className="flex gap-3 items-start bg-slate-50 rounded-xl p-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.gestionMultiService}
                onChange={(e) => set('gestionMultiService', e.target.checked)}
              />
              <span>
                <span className="text-sm font-bold text-slate-800">Activer la gestion de stock et de caisse</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Secrétariat, Mobile Money et boissons. Modifiable plus tard dans les paramètres.
                </span>
              </span>
            </label>
          )}

          {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {busy ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {busy ? 'Création en cours…' : 'Créer mon espace'}
          </button>
        </form>
      </div>
    </div>
  );
}
