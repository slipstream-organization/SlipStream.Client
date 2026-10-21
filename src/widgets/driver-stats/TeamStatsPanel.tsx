import { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, Gauge, MapPin, Medal, Star, Trophy, Users, XCircle } from 'lucide-react';
import { getTeamStats } from '../../shared/api';
import { DRIVER_BY_CODE, SEASON, TEAM_BY_ID } from '../../shared/mock/season';
import type { TeamId } from '../../shared/model/types';
import { teamCar, teamLogo } from '../../shared/lib/media';
import { DriverBadge } from '../../shared/ui/atoms';
import { BestYearCard, PanelShell, Stat } from './parts';
import { panelSection } from '../../shared/ui/motion';

function CarCard({ id }: { id: TeamId }) {
  const team = TEAM_BY_ID[id];
  const [carFailed, setCarFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <motion.div
      variants={panelSection}
      className="relative flex h-56 flex-col overflow-hidden rounded-xl p-3 lg:h-full lg:min-h-[300px]"
      style={{ background: `linear-gradient(160deg, ${team.color}, ${team.color}33 70%)` }}
    >
      {!logoFailed ? (
        <img src={teamLogo(id)} alt={team.name} onError={() => setLogoFailed(true)} className="h-8 w-auto self-start drop-shadow" />
      ) : (
        <span className="display text-xl text-black/70">{team.name}</span>
      )}
      {!carFailed && (
        <motion.img
          src={teamCar(id, 320)}
          alt={`${team.name} ${SEASON}`}
          onError={() => setCarFailed(true)}
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="absolute left-1/2 top-1/2 w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_12px_16px_rgba(0,0,0,0.45)] lg:w-[118%]"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-white">
        <div className="display text-xl leading-tight">{team.name}</div>
        <div className="text-[11px] text-white/70">{team.fullName}</div>
      </div>
    </motion.div>
  );
}

export function TeamStatsPanel({ id }: { id: TeamId }) {
  const { season, history, drivers } = getTeamStats(id);
  const team = TEAM_BY_ID[id];
  const maxPts = Math.max(1, ...drivers.map((d) => d.points));

  return (
    <PanelShell color={team.color}>
      <CarCard id={id} />

      <motion.section variants={panelSection}>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="display text-lg">Сезон {SEASON}</h4>
          <span className="rounded-full bg-f1-red px-2.5 py-0.5 font-mono text-xs font-bold text-white">P{season.position} у Кубку конструкторів</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<Star className="h-3 w-3" />} label="Очок" value={season.points} />
          <Stat icon={<Trophy className="h-3 w-3" />} label="Перемог" value={season.wins} accent={season.wins > 0} />
          <Stat icon={<Medal className="h-3 w-3" />} label="Подіумів" value={season.podiums} />
          <Stat icon={<Gauge className="h-3 w-3" />} label="Поулів" value={season.poles} />
          <Stat icon={<Users className="h-3 w-3" />} label="Дублів 1–2" value={season.oneTwos} accent={season.oneTwos > 0} />
          <Stat icon={<XCircle className="h-3 w-3" />} label="Сходів" value={season.dnfs} />
        </div>
        <div className="mt-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Внесок пілотів</div>
          <div className="space-y-2">
            {drivers.map((d, i) => {
              const dr = DRIVER_BY_CODE[d.code];
              return (
                <div key={d.code} className="flex items-center gap-3">
                  <DriverBadge code={d.code} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="truncate">{dr.lastName}</span>
                      <span className="font-mono">{d.points}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: team.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.points / maxPts) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <motion.section variants={panelSection}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="display text-lg">Історія</h4>
          <span className="flex items-center gap-1 truncate font-mono text-xs text-muted">
            <MapPin className="h-3 w-3 shrink-0" /> {history.base} · з {history.firstSeason}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat icon={<Crown className="h-3 w-3" />} label="Титулів" value={history.titles} accent={history.titles > 0} />
          <Stat icon={<Trophy className="h-3 w-3" />} label="Перемог" value={history.wins + season.wins} />
          <Stat icon={<Medal className="h-3 w-3" />} label="Подіумів" value={history.podiums + season.podiums} />
          <Stat icon={<Gauge className="h-3 w-3" />} label="Поулів" value={history.poles + season.poles} />
        </div>
        <BestYearCard year={history.best.year} position={history.best.position} color={team.color} label="Найкращий сезон в історії" />
      </motion.section>
    </PanelShell>
  );
}
