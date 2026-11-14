import { useState } from 'react';
import { cn } from '../lib/utils';

export function UserAvatar({ name, avatarUrl, className }: { name: string; avatarUrl?: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  const base = cn('grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-f1-red to-orange-500 font-black text-white', className);

  if (avatarUrl && !broken) {
    return (
      <span className={base}>
        <img src={avatarUrl} alt={name} referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      </span>
    );
  }
  return <span className={base}>{name.charAt(0).toUpperCase()}</span>;
}
