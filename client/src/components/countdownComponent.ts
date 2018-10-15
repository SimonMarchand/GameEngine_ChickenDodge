import { Component } from './component';
import { EventTrigger } from '../eventTrigger';
import * as GraphicsAPI from '../graphicsAPI';
import { ILogicComponent } from '../logicSystem';
import { Scene, IEntityDesc } from '../scene';
import { Timing } from '../timing';
import { IEntity } from '../entity';

// # Classe *CountdownComponent*
// Ce composant affiche un décompte et envoie un événement
// lorsqu'il a terminé.
interface ICountdownComponentDesc {
  sprites: string[];
  spriteTemplate: IEntityDesc;
  delay: number;
  handler?: string;
}

export class CountdownComponent extends Component<ICountdownComponentDesc> implements ILogicComponent {
  private handler = new EventTrigger();
  private sprites: string[] = [];
  private waitSprite!: string;
  private playerSpritePrefix!: string;
  private delay!: number;
  private spriteTemplate!: IEntityDesc;
  private index = -1;
  private shownTime!: number;
  private current?: IEntity;

  // ## Méthode *create*
  // Cette méthode est appelée pour configurer le composant avant
  // que tous les composants d'un objet aient été créés.
  create(descr: ICountdownComponentDesc) {
    this.sprites = [];
    this.sprites = descr.sprites;
    this.delay = descr.delay;
    this.spriteTemplate = descr.spriteTemplate;
    return this.preloadSprites();
  }

  // ## Méthode *setup*
  // Cette méthode est appelée pour configurer le composant après
  // que tous les composants d'un objet aient été créés.
  setup(descr: ICountdownComponentDesc) {
    if (descr.handler) {
      const tokens = descr.handler.split('.');
      this.handler.add(this.owner.getComponent(tokens[0]), tokens[1]);
    }
  }

  // ## Méthode *update*
  // À chaque itération, on vérifie si on a attendu le délai
  // désiré, et on change d'image si c'est le cas.
  update(timing: Timing) {
    if ((timing.now.getTime() - this.shownTime) < this.delay) {
      return;
    }
    this.index++;
    if (this.current) {
      this.owner.removeChild(this.current);
      delete this.current;
    }

    if (this.index >= this.sprites.length) {
      this.handler.trigger();
      this.enabled = false;
    } else {
      return this.showImage();
    }
  }

  // ## Méthode *preloadSprites*
  // Pré-charge les sprites pour qu'elles soient immédiatement
  // disponibles quand on voudra les afficher.
  private preloadSprites() {
    const p: Promise<any>[] = [];
    this.sprites.forEach((s) => {
      p.push(GraphicsAPI.preloadImage(s));
    });
    return Promise.all(p);
  }

  // ## Méthode *showImage*
  // Affiche une image parmi les sprites désirées, si il y en
  // a encore à afficher.
  private showImage() {
    this.shownTime = (new Date()).getTime();
    return this.showNamedImage(this.sprites[this.index]);
  }

  // ## Méthode *showNamedImage*
  // Affiche une image, directement à partir de son nom
  private showNamedImage(textureName: string) {
    this.spriteTemplate.components!.RawSprite.texture = textureName;
    return Scene.current.createChild(this.spriteTemplate, 'sprite', this.owner)
      .then((newSprite) => {
        this.current = newSprite;
      });
  }
}
