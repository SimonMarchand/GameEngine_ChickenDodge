import { Component } from './component';
import { SpriteComponent } from './spriteComponent';
import { IDisplayComponent } from '../displaySystem';
import { IEntity } from '../entity';
import * as GraphicsAPI from '../graphicsAPI';
import { TextureComponent } from './textureComponent';

let GL: WebGLRenderingContext;



// # Classe *LayerComponent*
// Ce composant représente un ensemble de sprites qui
// doivent normalement être considérées comme étant sur un
// même plan.
export class LayerComponent extends Component<Object> implements IDisplayComponent {
  private verticesArray!: Array<number>;
  private indicesArray!: Array<number>
  private vertexBuffer!: WebGLBuffer;
  private indexBuffer!: WebGLBuffer;
  private vertex : Float32Array = new Float32Array();
  private indices : Uint32Array = new Uint32Array();

  // ## Méthode *display*
  // La méthode *display* est appelée une fois par itération
  // de la boucle de jeu.
  display(dT: number) {
    const layerSprites = this.listSprites();
    if (layerSprites.length === 0) {
      return;
    }

    GL = GraphicsAPI.context;
    this.vertexBuffer = GL.createBuffer()!;
    this.indexBuffer = GL.createBuffer()!;

    const spriteSheet = layerSprites[0].spriteSheet;
    this.setupVerticesAndIndices(layerSprites);
    
    this.vertex = new Float32Array(this.verticesArray);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER,  this.vertex, GL.DYNAMIC_DRAW);

    this.indices = new Uint32Array(this.indicesArray);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, this.indices, GL.DYNAMIC_DRAW);

    spriteSheet.bind();
    GL.drawElements(GL.TRIANGLES, this.indices.length, GL.UNSIGNED_SHORT, 0); 
    spriteSheet.unbind();
  }

  private setupVerticesAndIndices(layerSprites: SpriteComponent[]) {
    this.verticesArray = new Array<number>();
    this.indicesArray = new Array<number>();
    let i: number = 0;
    for (i; i < layerSprites.length; i++) {
      this.verticesArray.push(...layerSprites[i].getVertices());
      this.indicesArray.push(4*i, 4*i+1, 4*i+2, 4*i+2, 4*i+3, 4*i);
    }
  }

  // ## Fonction *listSprites*
  // Cette fonction retourne une liste comportant l'ensemble
  // des sprites de l'objet courant et de ses enfants.
  private listSprites() {
    const sprites: SpriteComponent[] = [];
    this.getRecursiveSprites(this.owner, sprites);
    return sprites;
  }

  // ## Methode *getRecursiveSprites*
  // Cette méthode récursive ajoute à un tableau de SrpiteComponent
  // l'ensemble des sprites de l'entité passée en paramètre et de ses fils
  private getRecursiveSprites(owner : IEntity ,sprites: SpriteComponent[]) {
    owner.walkChildren((child) => {
      if (!child.active)
        return;
      child.walkComponent((comp) => {
        if (comp instanceof SpriteComponent && comp.enabled)
          sprites.push(comp);
      });
      this.getRecursiveSprites(child,sprites);
    });
  }
}

