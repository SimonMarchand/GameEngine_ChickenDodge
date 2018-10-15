import { IEntity, Entity } from '../entity';
import { Component } from './component';
import { SpriteSheetComponent } from './spriteSheetComponent';
import { Scene } from '../scene';
import * as Utils from '../utils';

// # Classe *BackgroundLoaderComponent*
// Cette classe instancie des sprites à partir d'un fichier
// de description. Ces sprites sont positionnés dans une grille,
// mais peuvent elle-mêmes être de tailles diverses.
interface IEntry {
  spriteName: string;
  isAnimated: boolean;
  frameSkip: number;
}

interface IEntryMap {
  [key: string]: IEntry;
}

interface IBackgroundLoaderComponentDesc {
  description: string;
  spriteSheet: string;
  scale: number;
  entryMap: IEntryMap;
}

export class BackgroundLoaderComponent extends Component<IBackgroundLoaderComponentDesc> {
  private entryMap!: IEntryMap;
  private scale!: number;

  // ## Méthode *create*
  // Cette méthode est appelée pour configurer le composant avant
  // que tous les composants d'un objet aient été créés.
  create(descr: IBackgroundLoaderComponentDesc) {
    this.entryMap = descr.entryMap;
    this.scale = descr.scale;
  }

  // ## Méthode *setup*
  // Cette méthode est responsable d'instancier les différents
  // objets contenant des sprites. La promesse n'est résolue que
  // lorsque toutes les sprites ont été créées.
  setup(descr: IBackgroundLoaderComponentDesc) {
    const spriteSheet = Component.findComponent<SpriteSheetComponent>(descr.spriteSheet);

    return Utils.loadAsync(descr.description, 'text/plain')
      .then((content) => {
        const p: Promise<any>[] = [];

        const lines = content.responseText.split(/\r?\n/);
        for (let row = 0; row < lines.length; ++row) {
          const chars = lines[row].split('');
          for (let col = 0; col < chars.length; ++col) {
            const char = chars[col];
            const entry = this.entryMap[char];
            if (!entry) {
              continue;
            }

            const pItem = Scene.current.createChild({
              components: {
                Position: {
                  x: col * this.scale,
                  y: row * this.scale,
                  z: row * 0.01,
                },
                Sprite: {
                  spriteSheet: spriteSheet,
                  spriteName: entry.spriteName,
                  isAnimated: entry.isAnimated,
                  frameSkip: entry.frameSkip,
                },
              }
            }, `${col}-${row}`, this.owner);
            p.push(pItem);
          }
        }

        return Promise.all(p);
      });
  }
}
