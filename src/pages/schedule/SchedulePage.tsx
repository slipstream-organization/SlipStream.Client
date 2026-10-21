import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api, getNextRace, isCompleted } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { Loader, Segmented } from '../../shared/ui/atoms';
import { stagger } from '../../shared/ui/motion';
import { RaceCard } from '../../widgets/race-card/RaceCard';
import { SEASON } from '../../shared/mock/season';

type Filter = 'all' | 'done' | 'upcoming';

export function SchedulePage() {
  const { data } = useData(api.calendar);
  const [filter, setFilter] = useState<Filter>('all');
  const next = getNextRace();

  const list = (data ?? []).filter((e) => {
    if (filter === 'all') return true;
    const done = e.testing || isCompleted(e);
    return filter === 'done' ? done : !done;
  });
  const doneCount = (data ?? []).filter((e) => !e.testing && isCompleted(e)).length;
  const total = (data ?? []).filter((e) => !e.testing).length;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 md:px-6">
      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-f1-red">F1 Schedule</div>
          <h1 className="display text-5xl md:text-7xl">Сезон {SEASON}</h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-surface-2">
              <motion.div className="h-full bg-f1-red" initial={{ width: 0 }} animate={{ width: `${(doneCount / (total || 1)) * 100}%` }} transition={{ duration: 1.2, ease: 'easeOut' }} />
            </div>
            <span className="font-mono text-xs text-muted">
              {doneCount}/{total} етапів
            </span>
          </div>
        </div>
        <Segmented
          layoutKey="schedule-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Усі' },
            { value: 'done', label: 'Завершені' },
            { value: 'upcoming', label: 'Попереду' },
          ]}
        />
      </div>

      {!data ? (
        <Loader />
      ) : (
        <motion.div key={filter} variants={stagger(0.04)} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((e) => (
              <RaceCard key={e.slug} event={e} isNext={e.round === next?.round && !e.testing} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
