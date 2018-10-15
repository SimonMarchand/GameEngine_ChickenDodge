import { Component } from './component';
import { ColliderComponent, ICollisionComponent } from './colliderComponent';
import { IInputComponent } from './inputComponent';
import { PositionComponent } from './positionComponent';
import { SpriteComponent } from './spriteComponent';
import { SpriteSheetComponent } from './spriteSheetComponent';
import { ScoreComponent } from './scoreComponent';
import { LifeComponent } from './lifeComponent';
import { RupeeComponent } from './rupeeComponent';
import { HeartComponent } from './heartComponent';
import { ChickenComponent } from './chickenComponent';
import { EventTrigger } from '../eventTrigger';
import { ILogicComponent } from '../logicSystem';
import { Timing } from '../timing';
import { vec3 } from 'gl-matrix';

enum Facing { Back = "B", Front = "F", Left = "L", Right = "R" }

// # Classe *PlayerComponent*
// Ce composant représente le comportement d'un joueur.
interface IArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface IPlayerComponentDesc {
  name: string;
  input: string;
  spriteSheet: string;
  prefix: string;
  score: string;
  life: string;
  gameArea: IArea;
  invulnerableDuration: number;
  hurtDuration: number;
  hurtMotion: number;
  onHurtEnable: string[];
}

export class PlayerComponent extends Component<IPlayerComponentDesc> implements ICollisionComponent, ILogicComponent {
  deadEvent = new EventTrigger();
  isDead = false;
  score!: ScoreComponent;
  name!: string;

  private prefix!: string;
  private gameArea!: IArea;
  private facing = Facing.Front;
  private isAttacking = false;
  private isMoving = false;
  private isHurt = false;
  private isInvulnerable = false;
  private invulnerableDuration!: number;
  private hurtDuration!: number;
  private hurtMotion!: number;
  private input!: IInputComponent;
  private spriteSheet!: SpriteSheetComponent;
  private life!: LifeComponent;
  private sprite!: SpriteComponent;

  // ## Méthode *create*
  // Cette méthode est appelée pour configurer le composant avant
  // que tous les composants d'un objet aient été créés.
  create(descr: IPlayerComponentDesc) {
    this.name = descr.name;
    this.prefix = descr.prefix;
    this.gameArea = descr.gameArea;
    this.invulnerableDuration = descr.invulnerableDuration;
    this.hurtDuration = descr.hurtDuration;
    this.hurtMotion = descr.hurtMotion;
  }

  // ## Méthode *setup*
  // Cette méthode configure le composant. Elle crée une instance
  // de sprite, et y configure une fonction de rappel lorsque
  // l'animation d'attaque est terminée.
  setup(descr: IPlayerComponentDesc) {
    this.input = Component.findComponent<IInputComponent>(descr.input)!;
    this.spriteSheet = Component.findComponent<SpriteSheetComponent>(descr.spriteSheet)!;
    this.score = Component.findComponent<ScoreComponent>(descr.score)!;
    this.life = Component.findComponent<LifeComponent>(descr.life)!;
    this.life.deadEvent.add(this, this.onDead);
    this.life.hurtEvent.add(this, this.onHurt);

    descr.onHurtEnable.forEach((item) => {
      const component = Component.findComponent(item)!;
      this.life.hurtEvent.add(this, () => {
        component.enabled = true;
      });
    });

    return this.owner.addComponent<SpriteComponent>('Sprite', {
      spriteSheet: this.spriteSheet
    }).then((spriteComp) => {
      this.sprite = spriteComp;
      this.sprite.animationEndedEvent.push(() => {
        this.isAttacking = false;
        this.sprite.frameSkip = 2;
        this.updateSprite();
        this.sprite.updateMesh();
      });
      this.updateSprite();
    });
  }

  // ## Méthode *onDead*
  // Déclenchée lorsque le joueur est mort
  private onDead() {
    this.isDead = true;
    this.deadEvent.trigger();
  }

  // ## Méthode *onHurt*
  // Déclenchée lorsque le joueur est blessé
  private onHurt() {
    const collider = this.owner.getComponent<ColliderComponent>('Collider')!;

    this.isHurt = true;
    setTimeout(() => {
      this.isHurt = false;
    }, this.hurtDuration);

    this.isInvulnerable = true;
    collider.enabled = false;
    setTimeout(() => {
      this.isInvulnerable = false;
      collider.enabled = true;
    }, this.invulnerableDuration);
  }

  // ## Méthode *update*
  // Cette méthode récupère les entrées du joueur, effectue les
  // déplacements appropriés, déclenche l'état d'attaque et ajuste
  // la sprite du joueur.
  update(timing: Timing) {
    let delta = undefined;
    if (this.isDead) {
      delta = this.updateDead();
    } else if (this.isHurt) {
      delta = this.updateHurt();
    } else {
      delta = this.updateStandard();
    }

    const visible = (!this.isInvulnerable) || (timing.frame % 2 != 0);
    this.sprite.enabled = visible;

    const position = this.owner.getComponent<PositionComponent>('Position')!;
    vec3.scale(delta, delta, 3);
    position.translate(delta);
    position.clamp(this.gameArea.x, this.gameArea.x + this.gameArea.w, this.gameArea.y, this.gameArea.y + this.gameArea.h);
  }

  // ## Méthode *updateDead*
  // Met à jour le joueur quand il est mort
  private updateDead() {
    this.isMoving = false;
    this.isAttacking = false;
    this.sprite.isAnimated = false;
    this.sprite.spriteName = `${this.prefix}D`;
    this.sprite.updateMesh();

    const collider = this.owner.getComponent<ColliderComponent>('Collider')!;
    collider.enabled = false;
    return vec3.create();
  }

  // ## Méthode *updateHurt*
  // Met à jour le joueur quand il est blessé
  private updateHurt() {
    this.isMoving = false;
    this.isAttacking = false;
    this.sprite.isAnimated = false;
    this.sprite.spriteName = `${this.prefix}H${this.facing}`;
    this.sprite.updateMesh();

    const delta = vec3.create();
    switch (this.facing) {
      case Facing.Back:
        delta[1] = this.hurtMotion;
        break;
      case Facing.Front:
        delta[1] = -this.hurtMotion;
        break;
      case Facing.Left:
        delta[0] = this.hurtMotion;
        break;
      case Facing.Right:
        delta[0] = -this.hurtMotion;
        break;
    }
    return delta;
  }

  // ## Méthode *updateStandard*
  // Met à jour le mouvement normal du joueur
  private updateStandard() {
    if (!this.isAttacking && this.input.getKey('attack')) {
      this.isAttacking = true;
      this.sprite.animationFrame = 1;
      this.sprite.frameSkip = 1;
    }

    const delta = vec3.create();

    if (this.input.getKey('up')) {
      delta[1]--;
      this.facing = Facing.Back;
    }
    if (this.input.getKey('down')) {
      delta[1]++;
      this.facing = Facing.Front;
    }
    if (this.input.getKey('left')) {
      delta[0]--;
      this.facing = Facing.Left;
    }
    if (this.input.getKey('right')) {
      delta[0]++;
      this.facing = Facing.Right;
    }

    this.isMoving = vec3.length(delta) > 0;

    this.updateSprite();
    this.sprite.updateMesh();

    return delta;
  }

  // ## Méthode *updateSprite*
  // Choisi la sprite appropriée selon le contexte.
  private updateSprite() {
    this.sprite.isAnimated = this.isMoving || this.isAttacking;
    const mod = this.isAttacking ? 'A' : 'M';
    const frame = this.sprite.isAnimated ? '' : '1';

    this.sprite.spriteName = `${this.prefix}${mod}${this.facing}${frame}`;
  }

  // ## Méthode *onCollision*
  // Cette méthode est appelée par le *CollisionComponent*
  // lorsqu'il y a collision entre le joueur et un objet pertinent.
  // Si cet objet est un rubis, on le récupère et on incrémente
  // le score, si c'est un poulet, on le détruit si on est en
  // état d'attaque, sinon on soustrait le score et on désactive
  // ce poulet.
  onCollision(otherCollider: ColliderComponent) {
    const obj = otherCollider.owner;
    const rupee = obj.getComponent<RupeeComponent>('Rupee');
    const heart = obj.getComponent<HeartComponent>('Heart');
    const chicken = obj.getComponent<ChickenComponent>('Chicken');

    if (rupee) {
      this.score.value += rupee.value;
      obj.active = false;
      obj.parent!.removeChild(obj);
    }
    if (heart) {
      this.life.value += heart.heal;
      obj.active = false;
      obj.parent!.removeChild(obj);
    }
    if (chicken) {
      if (this.isAttacking) {
        chicken.onAttack();
      } else {
        this.life.value -= chicken.attack;
      }
    }
  }
}
