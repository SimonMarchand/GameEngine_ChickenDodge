import { run } from './main';

export function init() {
  return run({
    canvasId: 'canvas',
    launchScene: 'scenes/play.json'
  });
}