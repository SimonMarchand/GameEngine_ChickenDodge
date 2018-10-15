import { Component, IComponent } from './component';
import { PositionComponent } from './positionComponent';
import { ILogicComponent } from '../logicSystem';
import { Rectangle } from './rectangle';

export interface ICollisionComponent extends IComponent {
  onCollision(other: ColliderComponent): void;
}

// ## Variable *colliders*
// On conserve ici une référence vers toutes les instances
// de cette classe, afin de déterminer si il y a collision.
const colliders: ColliderComponent[] = [];

// # Classe *ColliderComponent*
// Ce composant est attaché aux objets pouvant entrer en
// collision.
interface ISize {
  w: number;
  h: number;
}

interface IColliderComponentDesc {
  flag: number;
  mask: number;
  size: ISize;
  handler?: string;
}

export class ColliderComponent extends Component<IColliderComponentDesc> implements ILogicComponent {
  private flag!: number;
  private mask!: number;
  private size!: ISize;
  private handler?: ICollisionComponent;
  private active = true;

  // ## Méthode *create*
  // Cette méthode est appelée pour configurer le composant avant
  // que tous les composants d'un objet aient été créés.
  create(descr: IColliderComponentDesc) {
    this.flag = descr.flag;
    this.mask = descr.mask;
    this.size = descr.size;
  }

  // ## Méthode *setup*
  // Si un type *handler* est défini, on y appellera une méthode
  // *onCollision* si une collision est détectée sur cet objet.
  // On stocke également une référence à l'instance courante dans
  // le tableau statique *colliders*.
  setup(descr: IColliderComponentDesc) {
    if (descr.handler) {
      this.handler = this.owner.getComponent<ICollisionComponent>(descr.handler);
    }
    colliders.push(this);
  }

  // ## Méthode *update*
  // À chaque itération, on vérifie si l'aire courante est en
  // intersection avec l'aire de chacune des autres instances.
  // Si c'est le cas, et qu'un type *handler* a été défini, on
  // appelle sa méthode *onCollision* avec l'objet qui est en
  // collision.
  update() {
    if (!this.handler) {
      return;
    }

    const area = this.area;
    colliders.forEach((c) => {
      if (c === this ||
        !c.enabled ||
        !c.owner.active) {
        return;
      }
      if (area.intersectsWith(c.area)) {
        this.handler!.onCollision(c);
      }
    });
  }

  // ## Propriété *area*
  // Cette fonction calcule l'aire courante de la zone de
  // collision, après avoir tenu compte des transformations
  // effectuées sur les objets parent.
  get area() {
    const position = this.owner.getComponent<PositionComponent>('Position').worldPosition;
    return new Rectangle({
      x: position[0],
      y: position[1],
      width: this.size.w,
      height: this.size.h,
    });
  }
}
