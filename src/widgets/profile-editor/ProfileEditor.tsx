import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, X } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { HANDLE_PATTERN, identity, type CurrentUser, type ProfilePatch } from '../../shared/api/identity';
import { errorMessage, fieldErrors } from '../../shared/api/http';
import { DRIVERS, TEAMS } from '../../shared/mock/season';
import { cn } from '../../shared/lib/utils';

type HandleState = 'idle' | 'checking' | 'free' | 'taken' | 'invalid';

const SORTED_DRIVERS = [...DRIVERS].sort((a, b) => a.lastName.localeCompare(b.lastName));

export function ProfileEditor({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const { update } = useAuth();
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [team, setTeam] = useState(user.favouriteTeam ?? '');
  const [driver, setDriver] = useState(user.favouriteDriver ?? '');
  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChanged = handle.toLowerCase() !== user.handle.toLowerCase();

  useEffect(() => {
    if (!handleChanged) return;
    let alive = true;
    const timer = setTimeout(() => {
      if (!HANDLE_PATTERN.test(handle)) {
        setHandleState('invalid');
        return;
      }
      setHandleState('checking');
      identity
        .handleAvailable(handle)
        .then((free) => alive && setHandleState(free ? 'free' : 'taken'))
        .catch(() => alive && setHandleState('idle'));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [handle, handleChanged]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const patch: ProfilePatch = {};
  if (name.trim() !== user.name) patch.name = name.trim();
  if (handle !== user.handle) patch.handle = handle;
  if (team !== (user.favouriteTeam ?? '')) patch.favouriteTeam = team || null;
  if (driver !== (user.favouriteDriver ?? '')) patch.favouriteDriver = driver || null;
  const dirty = Object.keys(patch).length > 0;
  const blocked = handleChanged && (handleState === 'taken' || handleState === 'invalid' || handleState === 'checking');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty || blocked) return;
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await update(patch);
      onClose();
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const handleHint =
    handleChanged && handleState === 'invalid' ? 'Нік має містити 3–32 символи: латинські літери, цифри або _.'
    : handleChanged && handleState === 'taken' ? 'Цей нік уже зайнятий.'
    : handleChanged && handleState === 'free' ? 'Нік вільний.'
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-[18px] border border-line bg-bg p-6 text-ink md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Профіль</div>
            <h2 className="display mt-1 text-3xl">Редагування</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-line" aria-label="Закрити">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Ім'я" error={errors.name}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} className={inputClass(errors.name)} />
          </Field>

          <Field
            label="Нік"
            error={errors.handle ?? (handleState === 'taken' || handleState === 'invalid' ? handleHint : undefined)}
            hint={handleState === 'free' ? handleHint : undefined}
            adornment={
              handleChanged && handleState === 'checking' ? <Loader2 className="h-4 w-4 animate-spin text-muted" />
              : handleChanged && handleState === 'free' ? <Check className="h-4 w-4 text-emerald-500" />
              : null
            }
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span>
              <input value={handle} onChange={(e) => setHandle(e.target.value.trim())} maxLength={32} className={cn(inputClass(errors.handle), 'pl-7')} />
            </div>
          </Field>

          <Field label="Улюблена команда" error={errors.favouriteTeam}>
            <select value={team} onChange={(e) => setTeam(e.target.value)} className={inputClass(errors.favouriteTeam)}>
              <option value="">Не обрано</option>
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Улюблений пілот" error={errors.favouriteDriver}>
            <select value={driver} onChange={(e) => setDriver(e.target.value)} className={inputClass(errors.favouriteDriver)}>
              <option value="">Не обрано</option>
              {SORTED_DRIVERS.map((d) => (
                <option key={d.code} value={d.code}>{d.firstName} {d.lastName} · {d.code}</option>
              ))}
            </select>
          </Field>
        </div>

        {formError && (
          <div role="alert" className="mt-5 rounded-lg border border-f1-red/40 bg-f1-red/10 px-4 py-3 text-sm">{formError}</div>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-sm font-bold uppercase tracking-wide">
            Скасувати
          </button>
          <button
            type="submit"
            disabled={!dirty || blocked || saving}
            className="flex items-center gap-2 rounded-full bg-f1-red px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Зберегти
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function Field({ label, error, hint, adornment, children }: { label: string; error?: string; hint?: string; adornment?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-muted">
        {label}
        {adornment}
      </span>
      {children}
      {error ? <span className="text-xs text-f1-red">{error}</span> : hint ? <span className="text-xs text-emerald-500">{hint}</span> : null}
    </label>
  );
}

const inputClass = (error?: string) =>
  cn(
    'w-full rounded-lg border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-f1-red',
    error ? 'border-f1-red' : 'border-line',
  );
