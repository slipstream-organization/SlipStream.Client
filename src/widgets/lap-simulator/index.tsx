import { lazy, Suspense } from 'react';
import type { LapSimulatorProps } from './LapSimulator';
import { Loader } from '../../shared/ui/atoms';

// three.js is heavy — load the simulator only when it is actually shown
const LazySimulator = lazy(() => import('./LapSimulator'));

export function LapSimulator(props: LapSimulatorProps) {
  return (
    <Suspense
      fallback={
        <div className="grid aspect-[4/5] w-full place-items-center rounded-xl bg-[#26282d] sm:aspect-video">
          <Loader />
        </div>
      }
    >
      <LazySimulator {...props} />
    </Suspense>
  );
}
