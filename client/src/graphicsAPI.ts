// # Fonctions d'affichage
// Méthodes nécessaires pour charger et afficher
// des images à l'écran.

// ## Variable *canvas*
// Représente l'élément HTML où est rendu le jeu
export let canvas: HTMLCanvasElement;

// ## Variable *ctx*
// Représente le contexte de rendu, où s'exécutent
// les commandes pour contrôller l'affichage
export let context: WebGLRenderingContext;

interface IImages {
  [name: string]: HTMLImageElement;
}

// ## Variable *images*
// Comprend une liste des images pré-chargées
const images: IImages = {};


// ## Méthode *init*
// La méthode d'initialisation prend en paramètre le nom d'un objet de
// type *canvas* de la page web où dessiner. On y extrait
// et conserve alors une référence vers le contexte de rendu 3D.
export function init(canvasId: string) {
  canvas = <HTMLCanvasElement>document.getElementById(canvasId);
  const gl = canvas.getContext('webgl');
  if (!gl) {
    throw new Error('Impossible de récupérer le contexte WebGL!');
  }
  context = gl;
  return context;
}

// ## Méthode *preloadImage*
// Cette méthode instancie dynamiquement un objet du navigateur
// afin qu'il la charge. Ce chargement se faisant de façon
// asynchrone, on crée une [promesse](http://bluebirdjs.com/docs/why-promises.html)
// qui sera [résolue](http://bluebirdjs.com/docs/api/new-promise.html)
// lorsque l'image sera chargée.
export function preloadImage(name: string): Promise<any> {
  if (images[name]) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const imgDownload = new Image();
    imgDownload.onload = () => {
      images[name] = imgDownload;
      resolve();
    };
    imgDownload.src = name;
  });
}

// ## Méthode *loadImage*
// Attends le téléchargement d'une image et la retourne dans
// une promesse.
export function loadImage(name: string) {
  return preloadImage(name)
    .then(() => {
      return images[name];
    });
}

// ## Méthode *requestFullScreen*
// Méthode utilitaire pour mettre le canvas en plein écran.
// Il existe plusieurs méthodes selon le navigateur, donc on
// se doit de vérifier l'existence de celles-ci avant de les
// appeler.
//
// À noter qu'un script ne peut appeler le basculement en plein
// écran que sur une action explicite du joueur.
export function requestFullScreen() {
  const method = canvas.requestFullscreen || canvas.webkitRequestFullScreen || function () { };
  method.apply(canvas);
}
