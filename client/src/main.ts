import * as Utils from './utils';
import { Scene } from './scene';
import { SceneMgrSystem } from './sceneMgrSystem';
import { DisplaySystem } from './displaySystem';
import { LogicSystem } from './logicSystem';
import { ISystem } from './system';

export interface IConfig {
  canvasId: string;
  launchScene: string;
}

export let GlobalConfig: IConfig;

// ## Variable *systems*
// Représente la liste des systèmes utilisés par notre moteur
let systems: ISystem[];

let sceneMgr: SceneMgrSystem;

// ## Méthode *run*
// Cette méthode initialise les différents systèmes nécessaires
// et démarre l'exécution complète du jeu.
export function run(config: IConfig) {
  GlobalConfig = config;
  setupSystem(config);
  return launchGame(config);
}

// ## Méthode *launchGame*
// Cette méthode initialise la scène du jeu et lance la
// boucle de jeu.
function launchGame(config: IConfig) {
  return sceneMgr.loadScene(config.launchScene)
    .then(() => {
      return Utils.loop([iterate]);
    });
}

// ## Méthode *iterate*
// Réalise une itération sur chaque système.
function iterate(dT: number) {
  let p = Promise.resolve();
  systems.forEach((s) => {
    p = p.then(() => s.iterate(dT));
  });
  return p;
}

// ## Méthode *setupSystem*
// Cette méthode initialise les différents systèmes nécessaires.
function setupSystem(config: IConfig) {
  sceneMgr = new SceneMgrSystem();
  const display = new DisplaySystem(config.canvasId);
  const logic = new LogicSystem();

  systems = [sceneMgr, display, logic];
}
