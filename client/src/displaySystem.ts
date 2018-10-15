import * as GraphicsAPI from './graphicsAPI';
import { ISystem } from './system';
import { Scene, ISceneWalker } from './scene';
import { IEntity } from './entity';
import { IComponent } from './components/component';

// # Interface *IDisplayComponent*
// Déclare le type d'un composant géré par ce système.
export interface IDisplayComponent extends IComponent {
  // ### Méthode *display*
  // La méthode *display* de chaque composant est appelée une fois
  // par itération de la boucle de jeu.
  display(dT: number): Promise<any> | void;
}

// # Interface *ICameraComponent*
// Déclare le type d'un composant géré par ce système.
export interface ICameraComponent extends IComponent {
  // ### Méthode *render*
  // La méthode *render* de chaque composant est appelée une fois
  // par itération de la boucle de jeu.
  render(dT: number): Promise<any> | void;
}

// # Fonction *isDisplayComponent*
// Vérifie si le composant est du type `IDisplayComponent``
// Voir [la documentation de TypeScript](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
function isDisplayComponent(arg: IComponent): arg is IDisplayComponent {
  return (arg as IDisplayComponent).display !== undefined;
}

// # Fonction *isCameraComponent*
// Vérifie si le composant est du type `ICameraComponent``
// Voir [la documentation de TypeScript](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
function isCameraComponent(arg: IComponent): arg is ICameraComponent {
  return (arg as ICameraComponent).render !== undefined;
}

// # Classe *DisplaySystem*
// Représente le système permettant de gérer l'affichage
export class DisplaySystem implements ISystem {
  // ## Constructeur
  // Initialise l'API graphique.
  constructor(canvasId: string) {
    GraphicsAPI.init(canvasId);
  }

  // Méthode *iterate*
  // Appelée à chaque tour de la boucle de jeu
  // Parcourt l'ensemble des entités via le patron de
  // conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception)).
  iterate(dT: number) {
    const displayComp: IDisplayComponent[] = [];
    const cameraComp: ICameraComponent[] = [];

    const walkIterFn: ISceneWalker = (e) => this.walkFn(displayComp, cameraComp, e);
    let p = Promise.resolve();

    return Scene.current.walk(walkIterFn)
      .then(() => {
        displayComp.forEach((c) => {
          p = p.then(() => c.display(dT) as Promise<any>);
        });
        cameraComp.forEach((c) => {
          p = p.then(() => c.render(dT) as Promise<any>);
        });
        return p;
      });
  }

  // Méthode *walkFn*
  // Liste chaque composant respectant les interfaces
  // `IDisplayComponent` et `ICameraComponent`
  private walkFn(displayComp: IDisplayComponent[], cameraComp: ICameraComponent[], entity: IEntity) {
    entity.walkComponent((comp) => {
      if (isDisplayComponent(comp) && comp.enabled)
        displayComp.push(comp);
      if (isCameraComponent(comp) && comp.enabled)
        cameraComp.push(comp);
    });
    return Promise.resolve();
  }
}