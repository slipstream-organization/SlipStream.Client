import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { HANDLE_PATTERN, identity, type ProfilePatch, type CurrentUser } from '../../shared/api/identity';
import { errorMessage, fieldErrors } from '../../shared/api/http';
import { DRIVERS, TEAMS } from '../../shared/mock/season';
import { cn } from '../../shared/lib/utils';
import { Dialog } from '../../shared/ui/Dialog';
import { Button } from '../../shared/ui/Button';
import { Select } from '../../shared/ui/Select';
import { useToast } from '../../shared/ui/Toast';

type HandleState = 'idle' | 'checking' | 'free' | 'taken' | 'invalid';

const SORTED_DRIVERS = [...DRIVERS].sort((a, b) => a.lastName.localeCompare(b.lastName));
const TEAM_OPTIONS = [{ value: '', label: 'Не обрано' }, ...TEAMS.map((t) => ({ value: t.id as string, label: t.name }))];
const DRIVER_OPTIONS = [{ value: '', label: 'Не обрано' }, ...SORTED_DRIVERS.map((d) => ({ value: d.code, label: `${d.firstName} ${d.lastName} · ${d.code}` }))];

export function ProfileEditor({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const { update } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [team, setTeam] = useState(user.favouriteTeam ?? '');
  const [driver, setDriver] = useState(user.favouriteDriver ?? '');
  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [handleTouched, setHandleTouched] = useState(false); // errors show only after the first blur
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const handleInput = useRef<HTMLInputElement>(null);

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

  const patch: ProfilePatch = {};
  if (name.trim() !== user.name) patch.name = name.trim();
  if (handle !== user.handle) patch.handle = handle;
  if (team !== (user.favouriteTeam ?? '')) patch.favouriteTeam = team || null;
  if (driver !== (user.favouriteDriver ?? '')) patch.favouriteDriver = driver || null;
  const dirty = Object.keys(patch).length > 0;
  const blocked = handleChanged && (handleState === 'taken' || handleState === 'invalid' || handleState === 'checking');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!dirty) {
      setFormError('Немає змін для збереження.');
      return;
    }
    if (blocked) {
      setHandleTouched(true);
      handleInput.current?.focus();
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await update(patch);
      toast('Профіль збережено');
      onClose();
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const clearField = (key: string) => {
    setFormError(null);
    if (errors[key]) setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
  };

  const handleError =
    errors.handle ??
    (handleChanged && handleTouched && handleState === 'invalid' ? 'Нік має містити 3–32 символи: латинські літери, цифри або _.'
    : handleChanged && handleTouched && handleState === 'taken' ? 'Цей нік уже зайнятий — спробуйте інший.'
    : undefined);
  const handleHint = handleChanged && handleState === 'free' ? 'Нік вільний.' : undefined;

  return (
    <Dialog label="Редагування профілю" onClose={onClose} onSubmit={submit} panelClassName="max-w-lg p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted">Профіль</div>
          <h2 className="display mt-1 text-3xl">Редагування</h2>
        </div>
        <button type="button" onClick={onClose} className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line" aria-label="Закрити">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <Field label="Ім'я" error={errors.name}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearField('name');
            }}
            maxLength={64}
            autoComplete="name"
            className={inputClass(errors.name)}
          />
        </Field>

        <Field
          label="Нік"
          error={handleError}
          hint={handleHint}
          adornment={
            handleChanged && handleState === 'checking' ? <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Перевіряємо нік" />
            : handleChanged && handleState === 'free' ? <Check className="h-4 w-4 text-positive" aria-hidden />
            : null
          }
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span>
            <input
              ref={handleInput}
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value.trim());
                clearField('handle');
              }}
              onFocus={() => setHandleTouched(false)}
              onBlur={() => setHandleTouched(true)}
              maxLength={32}
              autoComplete="username"
              aria-invalid={!!handleError}
              className={cn(inputClass(handleError), 'pl-7')}
            />
          </div>
        </Field>

        <Field custom label="Улюблена команда" error={errors.favouriteTeam}>
          <Select value={team} onChange={(v) => { setTeam(v); clearField('favouriteTeam'); }} options={TEAM_OPTIONS} aria-label="Улюблена команда" invalid={!!errors.favouriteTeam} />
        </Field>

        <Field custom label="Улюблений пілот" error={errors.favouriteDriver}>
          <Select value={driver} onChange={(v) => { setDriver(v); clearField('favouriteDriver'); }} options={DRIVER_OPTIONS} aria-label="Улюблений пілот" invalid={!!errors.favouriteDriver} />
        </Field>
      </div>

      {formError && (
        <div role="alert" className="mt-5 rounded-md border border-f1-red/40 bg-f1-red/10 px-4 py-3 text-sm">
          {formError}
        </div>
      )}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Скасувати
        </Button>
        <Button type="submit" loading={saving}>
          Зберегти зміни
        </Button>
      </div>
    </Dialog>
  );
}

function Field({ label, error, hint, adornment, custom, children }: { label: string; error?: string; hint?: string; adornment?: ReactNode; custom?: boolean; children: ReactNode }) {
  // custom controls (dropdown) must not sit inside <label>: it would re-forward clicks on options to the trigger
  const Wrap = custom ? 'div' : 'label';
  return (
    <div className="flex flex-col gap-1.5">
      <Wrap className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between text-sm font-medium text-muted">
          {label}
          {adornment}
        </span>
        {children}
      </Wrap>
      {/* reserved line: helper and error share one slot so the form never jumps */}
      <span role={error ? 'alert' : undefined} className={cn('min-h-5 text-xs', error ? 'text-accent-ink' : 'text-positive')}>
        {error ?? hint ?? ''}
      </span>
    </div>
  );
}

const inputClass = (error?: string) =>
  cn(
    'min-h-11 w-full rounded-md border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-f1-red',
    error ? 'border-f1-red' : 'border-line',
  );
