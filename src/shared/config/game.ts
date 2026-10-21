/**
 * Pole challenge setup.
 *  - The game itself lives in Steam: the site opens `steam://run/<appId>` and Steam starts it.
 *  - SlipStream Telemetry (.exe) runs next to the game, reads its UDP telemetry
 *    and uploads the finished lap to the API, tagged with the challenge code.
 * Until the exe and the API exist the challenge window offers a demo run.
 */
export const GAME = {
  /** flip to true once the Steam App ID is set */
  launchEnabled: false,
  gameName: 'F1® 25',
  steamAppId: '0000000', // TODO: real App ID
  /** UDP port the game broadcasts telemetry on (game settings → Telemetry) */
  udpPort: 20777,
  telemetry: {
    name: 'SlipStream Telemetry',
    version: '0.1.0',
    size: '~18 MB',
    /** TODO: link to the installer once it is built */
    downloadUrl: '',
  },
};

export const steamUri = () => `steam://run/${GAME.steamAppId}`;

/** Short code the telemetry app uses to attach a lap to this challenge. */
export const challengeCode = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = () => abc[Math.floor(Math.random() * abc.length)];
  return `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
};
