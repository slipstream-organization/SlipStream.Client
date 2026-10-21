import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { NewsItem } from '../../shared/model/types';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { fadeUp } from '../../shared/ui/motion';
import { cn } from '../../shared/lib/utils';

export function NewsCard({ item, featured }: { item: NewsItem; featured?: boolean }) {
  return (
    <motion.article variants={fadeUp} className={cn('group card relative cursor-pointer overflow-hidden', featured && 'md:col-span-2')}>
      <div className={cn('relative overflow-hidden bg-[#15151e]', featured ? 'aspect-[21/9]' : 'aspect-[16/9]')}>
        <div className="absolute inset-0 bg-gradient-to-br from-f1-red/40 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(-60deg,transparent_0_22px,rgba(255,255,255,.06)_22px_24px)]" />
        {item.circuitId && (
          <TrackOutline
            circuitId={item.circuitId}
            className="absolute left-[8%] top-1/2 h-[62%] w-[60%] -translate-y-1/2 text-white/10 transition-colors duration-700 group-hover:text-white/20"
            strokeWidth={featured ? 3 : 2.5}
          />
        )}
        {item.image?.kind === 'photo' && (
          <img src={item.image.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        {item.image?.kind === 'car' && (
          <img
            src={item.image.src}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className={cn(
              'absolute object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.6)] transition-transform duration-700 ease-out group-hover:-translate-x-[4%]',
              featured ? 'bottom-[10%] right-[-4%] w-[62%]' : 'bottom-[12%] right-[-10%] w-[92%]',
            )}
          />
        )}
        {item.image?.kind === 'driver' && (
          <img
            src={item.image.src}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className={cn(
              'absolute bottom-0 h-[112%] origin-bottom object-contain object-bottom drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-105',
              featured ? 'right-[8%]' : 'right-[4%]',
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded bg-f1-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">{item.tag}</span>
        {featured && <h3 className="display absolute bottom-5 left-5 right-24 text-2xl text-white sm:text-4xl">{item.title}</h3>}
      </div>
      <div className="p-5">
        {!featured && <h3 className="text-lg font-bold leading-snug transition-colors group-hover:text-f1-red">{item.title}</h3>}
        <p className={cn('text-sm text-muted', !featured && 'mt-2 line-clamp-2')}>{item.excerpt}</p>
        <div className="mt-4 flex items-center gap-3 font-mono text-[11px] uppercase text-muted">
          <span>{new Date(item.date).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' })}</span>
          <span>·</span>
          <span>{item.readMinutes} хв читання</span>
          <ArrowRight className="ml-auto h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      </div>
    </motion.article>
  );
}
