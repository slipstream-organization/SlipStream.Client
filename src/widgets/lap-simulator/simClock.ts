/** Mutable playback clock shared by the scene and the HUD controls. */
export class SimClock {
  t = 0;
  playing: boolean;
  rate = 1;
  constructor(playing: boolean) {
    this.playing = playing;
  }
  advance(dt: number, lapTime: number) {
    if (this.playing) this.t = (this.t + dt * this.rate) % lapTime;
    return this.t;
  }
}
