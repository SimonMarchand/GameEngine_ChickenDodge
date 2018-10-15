import { ISystem } from './system';
import { Scene, ISceneWalker } from './scene';
import { IEntity } from './entity';
import { IComponent } from './components/component';
import { Timing } from './timing';

// # Interface *ILogicComponent*
// Déclare le type d'un composant géré par ce système.
export interface ILogicComponent extends IComponent {
  // ### Méthode *update*
  // La méthode *update* de chaque composant est appelée une fois
  // par itération de la boucle de jeu.
  update(timing: Timing): Promise<any> | void;
}

// # Fonction *isLogicComponent*
// Vérifie si le composant est du type `ILogicComponent``
// Voir [la documentation de TypeScript](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
function isLogicComponent(arg: IComponent): arg is ILogicComponent {
  return (arg as ILogicComponent).update !== undefined;
}

// # Classe *LogicSystem*
// Représente le système permettant de mettre à jour la logique
export class LogicSystem implements ISystem {
  private frameCount = 0;

  // Méthode *iterate*
  // Appelée à chaque tour de la boucle de jeu
  // Parcourt l'ensemble des entités via le patron de
  // conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception)).
  iterate(dT: number) {
    const timing = new Timing(dT, this.frameCount++);
    const components: ILogicComponent[] = [];

    const walkIterFn: ISceneWalker = (e) => this.walkFn(components, e);
    return Scene.current.walk(walkIterFn)
      .then(() => {
        const p: Promise<any>[] = [];
        components.forEach((c) => p.push(c.update(timing) as Promise<any>));
        return Promise.all(p);
      });
  }

  // Méthode *walkFn*
  // Liste chaque composant respectant l'interface `ILogicComponent`
  private walkFn(components: ILogicComponent[], entity: IEntity) {
    entity.walkComponent((comp) => {
      if (isLogicComponent(comp) && comp.enabled)
        components.push(comp);
    });
    return Promise.resolve();
  }
}