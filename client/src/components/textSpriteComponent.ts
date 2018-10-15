import { Component } from './component';
import { SpriteComponent } from './spriteComponent';
import { SpriteSheetComponent } from './spriteSheetComponent';
import { Scene } from '../scene';
import { IEntity } from '../entity';

// # Classe *TextSpriteComponent*
enum TextAlign { Left = "left", Right = "right" }

interface ITextSpriteCompDesc {
  spriteSheet: string;
  align: TextAlign;
}

export class TextSpriteComponent extends Component<ITextSpriteCompDesc> {
  private spriteSheet!: SpriteSheetComponent;
  private align!: TextAlign;
  private sprites: IEntity[] = [];
  private _text: string[] = [];

  // ## Méthode *create*
  // Cette méthode est appelée pour configurer le composant avant
  // que tous les composants d'un objet aient été créés.
  create(descr: ITextSpriteCompDesc) {
    this.align = descr.align;
  }

  // ## Méthode *setup*
  // Cette méthode conserve la feuille de sprite comportant
  // les glyphes du texte, et met le texte à jour.
  setup(descr: ITextSpriteCompDesc) {
    this.spriteSheet = Component.findComponent<SpriteSheetComponent>(descr.spriteSheet)!;
    return this.updateTextSprites();
  }

  // ## Propriété *text*
  // Cette propriété met à jour le texte affiché. On force tout
  // d'abord le paramètre à un type de chaîne de caractères,
  // et on ne met à jour que si le texte a changé.
  set text(text: string) {
    this.array = String(text).split('');
  }

  // ## Propriété *array*
  // Cette propriété met à jour le texte affiché, à partir d'un
  // tableau d'identifiants de sprites.
  set array(array: string[]) {
    let changed = array.length !== this._text.length;
    if (!changed) {
      for (let i = 0; i < array.length; ++i) {
        if (array[i] !== this._text[i]) {
          changed = true;
        }
      }
    }

    if (!changed) {
      return;
    }
    this._text = array;
    this.updateTextSprites();
  }

  // ## Méthode *updateTextSprites*
  // On crée de nouvelles sprites pour chaque caractère de la
  // chaîne, on les positionne correctement, et on détruit les
  // anciens sprites.
  private updateTextSprites() {
    const oldSprites = this.sprites;
    this.sprites = [];

    let offset = 0;
    const dir = (this.align === TextAlign.Left) ? 1 : -1;
    let text = this._text.slice();
    if (this.align === TextAlign.Right) {
      text = text.reverse();
    }

    let p: Promise<any> = Promise.resolve();
    text.forEach((c, index) => {
      if (!this.spriteSheet.sprites[c]) {
        return;
      }

      const x = offset;
      offset += this.spriteSheet.sprites[c].sourceSize.w * dir;

      const template = {
        components: {
          Sprite: {
            spriteSheet: this.spriteSheet,
            isAnimated: false,
            spriteName: c,
          },
          Position: {
            x: x,
          }
        }
      };

      p = p.then(() =>
        Scene.current.createChild(template, `${this._text}_${index}`, this.owner)
          .then((newSpriteObj) => {
            this.sprites.push(newSpriteObj);
          })
      );
    });

    return p.then(() => {
      oldSprites.forEach((s) => {
        s.parent!.removeChild(s);
      });
    });
  }
}
