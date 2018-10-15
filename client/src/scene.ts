import { IEntity, Entity } from './entity';
import { IComponent } from './components/component';

// # Interface *ISceneWalker*
// Définit le prototype de fonction permettant d'implémenter
// le patron de conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception))
// sur les différentes entités de la scène.
export interface ISceneWalker {
  (entity: IEntity, name: string): Promise<any>;
}

// # Interfaces de description
// Ces interfaces permettent de définir la structure de
// description d'une scène, telle que normalement chargée
// depuis un fichier JSON.
export interface IComponentDesc {
  [key: string]: any;
}

export interface IEntityDesc {
  components?: IComponentDesc;
  children?: ISceneDesc;
}

export interface ISceneDesc {
  [key: string]: IEntityDesc;
}

interface IInitFn {
  (comp: IComponent, desc: any): Promise<any> | void;
}

// # Classe *Scene*
// La classe *Scene* représente la hiérarchie d'objets contenus
// simultanément dans la logique du jeu.
export class Scene {
  static current: Scene;
  private root = new Entity();
  private compDescr = new Map<IComponent, ISceneDesc>();

  // ## Fonction statique *create*
  // La fonction *create* permet de créer une nouvelle instance
  // de la classe *Scene*, contenant tous les objets instanciés
  // et configurés. Le paramètre `description` comprend la
  // description de la hiérarchie et ses paramètres. La fonction
  // retourne une promesse résolue lorsque l'ensemble de la
  // hiérarchie est configurée correctement.
  static create(description: ISceneDesc): Promise<Scene> {
    const scene = new Scene();
    Scene.current = scene;
    return scene.createChildren(description, scene.root)
      .then(() => {
        let root = scene.root;
        return scene;
      });
  }

  private constructor() {
  }

  private createChildren(description: ISceneDesc, parent: IEntity) {
    let p: Promise<any> = Promise.resolve();

    Object.keys(description).forEach((name) => {
      const descr = description[name];
      p = p.then(() => this.createChild(descr, name, parent));
    });
    return p;
  }

  createChild(descr: IEntityDesc, name: string, parent: IEntity) {
    const newObj = new Entity();
    parent.addChild(name, newObj);
    let p: Promise<any> = Promise.resolve()
      .then(() => this.createChildren(descr.children || {}, newObj));

    Object.keys(descr.components || {}).forEach((type) => {
      const compDescr = descr.components![type];
      p = p.then(() => newObj.addComponent(type, compDescr));
    });
    return p.then(() => newObj);
  }

  onComponentCreated(comp: IComponent, descr: IComponentDesc) {
    this.compDescr.set(comp, descr);
  }

  // ## Fonction *findObject*
  // La fonction *findObject* retourne l'objet de la scène
  // portant le nom spécifié.
  findObject(objectName: string): IEntity | undefined {
    return this.findObjectRecursive(this.root, objectName);
  }

  private findObjectRecursive(parent: IEntity, objectName: string) {
    let found = parent.getChild(objectName);
    if (found) {
      return found;
    }
    parent.walkChildren((obj) => {
      if (!found)
        found = this.findObjectRecursive(obj, objectName);
    });
    return found;
  }

  // ## Méthode *walk*
  // Cette méthode parcourt l'ensemble des entités de la
  // scène et appelle la fonction `fn` pour chacun, afin
  // d'implémenter le patron de conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception)).
  walk(fn: ISceneWalker, onlyActive: boolean = true): Promise<any> {
    return this.walkRecursive(fn, this.root, '(root)', onlyActive);
  }

  private walkRecursive(fn: ISceneWalker, entity: IEntity, name: string, onlyActive: boolean) {
    let p = Promise.resolve();
    if (onlyActive && !entity.active)
      return p;

    entity.walkChildren((c, k) => {
      p = p.then(() => fn(c, k))
        .then(() => this.walkRecursive(fn, c, k, onlyActive));
    });
    return p;
  }

  refresh() {
    let p = this.refreshLoop();
    if (p) {
      p = p.then(() => {
        this.refresh();
      });
    }
    return p;
  }

  private refreshLoop(): Promise<any> | null {
    if (this.compDescr.size > 0) {
      return this.setupMissing();
    }
    return null;
  }

  private setupMissing() {
    const p: Promise<any>[] = [];
    this.compDescr.forEach((descr, comp) => {
      const pItem = Promise.resolve()
        .then(() => {
          return comp.setup(descr);
        })
        .then(() => {
          this.compDescr.delete(comp);
        });
      p.push(pItem);
    });
    return Promise.all(p);
  }
}
