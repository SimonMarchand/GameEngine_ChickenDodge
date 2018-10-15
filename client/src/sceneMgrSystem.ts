import { ISystem } from './system';
import { Scene, ISceneDesc } from './scene';
import * as Utils from './utils';

export class SceneMgrSystem implements ISystem {
  // Méthode *iterate*
  // Appelée à chaque tour de la boucle de jeu
  iterate(dT: number) {
    return Promise.resolve().then(() => Scene.current.refresh());
  }

  loadScene(file: string) {
    return Utils.loadJSON<ISceneDesc>(file)
      .then((sceneDescription) => {
        return Scene.create(sceneDescription);
      });
  }
}