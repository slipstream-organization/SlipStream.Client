import { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, Flag as FlagIcon, Gauge, Medal, Star, Trophy, XCircle } from 'lucide-react';
import { getDriverStats } from '../../shared/api';
import { DRIVER_BY_CODE, SEASON, TEAM_BY_ID } from '../../shared/mock/season';
import { driverPhoto } from '../../shared/lib/media';
import { Flag } from '../../shared/ui/atoms';
import { cn } from '../../shared/lib/utils';
import { BestYearCard, PanelShell, Stat } from './parts';
import { panelSection } from '../../shared/ui/motion';

function FormChip({ position, label }: { position: number | null; label: string }) {
  const tone = position === null ? 'bg-f1-red text-white' : position === 1 ? 'bg-amber-400 text-black' : position <= 3 ? 'bg-ink text-bg' : position <= 10 ? 'bg-surface text-ink' : 'bg-surface text-muted';
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn('grid h-9 w-9 place-items-center rounded-md font-mono text-xs font-bold', tone)}>{position === null ? 'DNF' : `P${position}`}</span>
      <span className="font-mono text-[9px] text-muted">{label}</span>
    </div>
  );
}

function DriverPortrait({ code }: { code: string }) {
  const d = DRIVER_BY_CODE[code];
  const team = TEAM_BY_ID[d.teamId];
  const [failed, setFailed] = useState(false);
  const src = driverPhoto(code, '4col');
  return (
    <motion.div
      variants={panelSection}
      className="relative flex h-56 overflow-hidden rounded-xl lg:h-full lg:min-h-[300px]"
      style={{ background: `linear-gradient(160deg, ${team.color}, ${team.color}33 70%)` }}
    >
      <span className="display absolute -right-2 top-1 text-[110px] leading-none text-black/15">{d.number}</span>
      {src && !failed && (
        <motion.img
          src={src}
          alt={`${d.firstName} ${d.lastName}`}
          onError={() => setFailed(true)}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="absolute bottom-0 left-1/2 h-[92%] -translate-x-1/2 object-contain object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-white">
        <div className="flex items-center gap-1.5 text-xs">
          <Flag code={d.country} className="h-4 w-4 ring-0" />
          {d.firstName}
        </div>
        <div className="display text-2xl">{d.lastName}</div>
        <div className="text-[11px] text-white/70">{team.name}</div>
      </div>
    </motion.div>
  );
}

/** `standalone` = on the driver page: no portrait column, no row chrome. */
export function DriverStatsPanel({ code, standalone }: { code: string; standalone?: boolean }) {
  const { season, career } = getDriverStats(code);
  const team = TEAM_BY_ID[DRIVER_BY_CODE[code].teamId];

  return (
    <PanelShell color={team.color} bare={standalone}>
      {!standalone && <DriverPortrait code={code} />}

      <motion.section variants={panelSection}>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="display text-lg">Сезон {SEASON}</h4>
          <span className="rounded-full bg-f1-red px-2.5 py-0.5 font-mono text-xs font-bold text-white">P{season.position} в чемпіонаті</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<FlagIcon className="h-3 w-3" />} label="Стартів" value={season.starts} />
          <Stat icon={<Trophy className="h-3 w-3" />} label="Перемог" value={season.wins} accent={season.wins > 0} />
          <Stat icon={<Medal className="h-3 w-3" />} label="Подіумів" value={season.podiums} />
          <Stat icon={<Star className="h-3 w-3" />} label="Очок" value={season.points} />
          <Stat icon={<Gauge className="h-3 w-3" />} label="Поулів" value={season.poles} />
          <Stat icon={<XCircle className="h-3 w-3" />} label="Сходів" value={season.dnfs} />
        </div>
        {season.form.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              Форма · останні {season.form.length} · найкращий фініш {season.bestFinish ? `P${season.bestFinish}` : '—'}
            </div>
            <div className="flex gap-2">
              {season.form.map((f) => (
                <FormChip key={f.round} position={f.position} label={f.label} />
              ))}
            </div>
          </div>
        )}
      </motion.section>

      <motion.section variants={panelSection}>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="display text-lg">Кар'єра</h4>
          <span className="font-mono text-xs text-muted">дебют {career.debut}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<FlagIcon className="h-3 w-3" />} label="Стартів" value={career.starts} />
          <Stat icon={<Trophy className="h-3 w-3" />} label="Перемог" value={career.wins} accent={career.wins > 0} />
          <Stat icon={<Medal className="h-3 w-3" />} label="Подіумів" value={career.podiums} />
          <Stat icon={<Star className="h-3 w-3" />} label="Очок" value={career.points} />
          <Stat icon={<Gauge className="h-3 w-3" />} label="Поулів" value={career.poles} />
          <Stat icon={<Crown className="h-3 w-3" />} label="Титулів" value={career.titles} accent={career.titles > 0} />
        </div>
        <BestYearCard year={career.best.year} position={career.best.position} color={team.color} />
      </motion.section>
    </PanelShell>
  );
}
