import { IComponent } from './components/component';
import { ComponentFactory } from './components';
import { Scene, IComponentDesc } from './scene';

export interface IEntityWalker {
  (entity: IEntity, name: string): Promise<any> | void;
}

export interface IComponentWalker {
  (comp: IComponent, type: string): Promise<any> | void;
}

// # Interface *IEntity*
// Cette interface présente la structure d'une entité valide
export interface IEntity {
  parent: IEntity | null;
  active: boolean;
  addChild(name: string, child: IEntity): void;
  removeChild(child: IEntity): void;
  getChild(name: string): IEntity | undefined;
  addComponent<T extends IComponent>(type: string, descr: IComponentDesc): Promise<T>;
  getComponent<T extends IComponent>(type: string): T;
  walkChildren(fn: IEntityWalker): void;
  walkComponent(fn: IComponentWalker): void;
}

interface IChildEntry {
  name: string;
  order: number;
  child: IEntity;
}

// # Classe *Entity*
// La classe *Entity* représente un objet de la scène qui
// peut contenir des enfants et des composants.
export class Entity implements IEntity {
  // ## Fonction *componentCreator*
  // Référence vers la fonction permettant de créer de
  // nouveaux composants. Permet ainsi de substituer
  // cette fonction afin de réaliser des tests unitaires.
  static componentCreator = ComponentFactory.create;

  // ## Membre *active*
  // Si ce membre a une valeur fausse, les systèmes devraient
  // ignorer les composants de cet objet et ses enfants.
  active = true;

  private components = new Map<string, IComponent>();

  private nextChildOrder = 0;
  private children = new Set<IChildEntry>();
  private childrenByName = new Map<string, IChildEntry>();
  private childrenByChild = new Map<IEntity, IChildEntry>();

  parent: IEntity | null = null;

  // ## Méthode *addComponent*
  // Cette méthode prend en paramètre le type d'un composant et
  // instancie un nouveau composant.
  addComponent<T extends IComponent>(type: string, descr: IComponentDesc): Promise<T> {
    const newComponent = Entity.componentCreator(type, this) as T;
    this.components.set(type, newComponent);
    return Promise.resolve()
      .then(() => newComponent.create(descr))
      .then(() => {
        Scene.current.onComponentCreated(newComponent, descr);
        return newComponent;
      });
  }

  // ## Fonction *getComponent*
  // Cette fonction retourne un composant existant du type spécifié
  // associé à l'objet.
  getComponent<T extends IComponent>(type: string): T {
    return <T>this.components.get(type);
  }

  // ## Méthode *addChild*
  // La méthode *addChild* ajoute à l'objet courant un objet
  // enfant.
  addChild(objectName: string, child: IEntity) {
    if (child.parent)
      throw new Error("Cet objet est déjà attaché à un parent");

    const childEntry = {
      name: objectName,
      order: this.nextChildOrder++,
      child: child,
    }

    this.children.add(childEntry);
    this.childrenByName.set(objectName, childEntry);
    this.childrenByChild.set(child, childEntry);

    child.parent = this;
  }

  // ## Méthode *removeChild*
  // La méthode *removeChild* enlève un enfant de l'objet courant
  removeChild(child: IEntity) {
    if (child.parent !== this)
      throw new Error("Cet object n'est pas attaché à ce parent");

    const childEntry = this.childrenByChild.get(child)!;
    this.childrenByChild.delete(child);

    if (this.childrenByName.get(childEntry.name) === childEntry)
      this.childrenByName.delete(childEntry.name);

    this.children.delete(childEntry);

    child.parent = null;
  }

  // ## Fonction *getChild*
  // La fonction *getChild* retourne un objet existant portant le
  // nom spécifié, dont l'objet courant est le parent.
  getChild(objectName: string): IEntity | undefined {
    const childEntry = this.childrenByName.get(objectName);
    if (childEntry)
      return childEntry.child;
  }

  // ## Méthode *walkChildren*
  // Cette méthode parcourt l'ensemble des enfants de cette
  // entité et appelle la fonction `fn` pour chacun, afin
  // d'implémenter le patron de conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception)).
  walkChildren(fn: IEntityWalker): void {
    const sortedChildren = Array.from(this.children).sort((a, b) => a.order - b.order);
    sortedChildren.forEach((v) => fn(v.child, v.name));
  }

  // ## Méthode *walkComponent*
  // Cette méthode parcourt l'ensemble des composants de cette
  // entité et appelle la fonction `fn` pour chacun, afin
  // d'implémenter le patron de conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception)).
  walkComponent(fn: IComponentWalker): void {
    this.components.forEach(fn);
  }
}