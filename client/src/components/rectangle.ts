// ## Classe *Rectangle*
// Classe pour représenter un rectangle.
interface IRectangleDesc {
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface IRectangleDescAlt {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Rectangle {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;

  // ### Constructeur de la classe *Rectangle*
  // Le constructeur de cette classe prend en paramètre un
  // objet pouvant définir soit le centre et la taille du
  // rectangle (`x`, `y`, `width` et `height`) ou les côtés
  // de celui-ci (`xMin`, `xMax`, `yMin` et `yMax`).
  constructor(descr: IRectangleDesc) {
    const descrAlt = <IRectangleDescAlt>descr;
    this.xMin = descr.xMin || (descrAlt.x - descrAlt.width / 2);
    this.xMax = descr.xMax || (descrAlt.x + descrAlt.width / 2);
    this.yMin = descr.yMin || (descrAlt.y - descrAlt.height / 2);
    this.yMax = descr.yMax || (descrAlt.y + descrAlt.height / 2);
  }

  // ### Fonction *intersectsWith*
  // Cette fonction retourne *vrai* si ce rectangle et celui
  // passé en paramètre se superposent.
  intersectsWith(other: Rectangle) {
    return !(
      (this.xMin >= other.xMax) ||
      (this.xMax <= other.xMin) ||
      (this.yMin >= other.yMax) ||
      (this.yMax <= other.yMin)
    );
  }
}
