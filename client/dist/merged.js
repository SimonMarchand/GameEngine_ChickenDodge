// # Fonctions utilitaires
// Fonctions utilitaires pour des méthodes génériques qui n'ont
// pas de lien direct avec le jeu.
define("utils", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // ## Fonction *requestAnimationFrame*
    // Encapsuler dans une promesse la méthode qui attend la mise
    // à jour de l'affichage.
    function requestAnimationFrame() {
        return new Promise((resolve) => {
            window.requestAnimationFrame(resolve);
        });
    }
    // ## Fonction *iterate*
    // Exécute une itération de la boucle de jeu, en attendant
    // après chaque étape du tableau `actions`.
    function iterate(actions, delta) {
        let p = Promise.resolve();
        actions.forEach((a) => {
            p = p.then(() => {
                return a(delta);
            });
        });
        return p;
    }
    // ## Fonction *loop*
    // Boucle de jeu simple, on lui passe un tableau de fonctions
    // à exécuter à chaque itération. La boucle se rappelle elle-même
    // après avoir attendu le prochain rafraîchissement de l'affichage.
    let lastTime = 0;
    function loop(actions, time = 0) {
        // Le temps est compté en millisecondes, on désire
        // l'avoir en secondes, sans avoir de valeurs trop énorme.
        const delta = clamp((time - lastTime) / 1000, 0, 0.1);
        lastTime = time;
        const nextLoop = (t) => loop(actions, t);
        return iterate(actions, delta)
            .then(requestAnimationFrame)
            .then(nextLoop);
    }
    exports.loop = loop;
    // ## Fonction *inRange*
    // Méthode utilitaire retournant le booléen *vrai* si une
    // valeur se situe dans un interval.
    function inRange(x, min, max) {
        return (min <= x) && (x <= max);
    }
    exports.inRange = inRange;
    // ## Fonction *clamp*
    // Méthode retournant la valeur passée en paramètre si elle
    // se situe dans l'interval spécifié, ou l'extrémum correspondant
    // si elle est hors de l'interval.
    function clamp(x, min, max) {
        return Math.min(Math.max(x, min), max);
    }
    exports.clamp = clamp;
    // ## Fonction *loadAsync*
    // Fonction qui charge un fichier de façon asynchrone,
    // via une [promesse](http://bluebirdjs.com/docs/why-promises.html)
    function loadAsync(url, mime, responseType) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('error', reject);
            xhr.addEventListener('load', () => {
                resolve(xhr);
            });
            if (mime) {
                xhr.overrideMimeType(mime);
            }
            xhr.open('GET', url);
            if (responseType) {
                xhr.responseType = responseType;
            }
            xhr.send();
        });
    }
    exports.loadAsync = loadAsync;
    // ## Fonction *loadJSON*
    // Fonction qui charge un fichier JSON de façon asynchrone,
    // via une [promesse](http://bluebirdjs.com/docs/why-promises.html)
    function loadJSON(url) {
        return loadAsync(url)
            .then((xhr) => {
            return JSON.parse(xhr.responseText);
        });
    }
    exports.loadJSON = loadJSON;
});
define("components/component", ["require", "exports", "scene"], function (require, exports, scene_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // ## Classe *Component*
    // Cette classe est une classe de base pour l'ensemble des
    // composants et implémente les méthodes par défaut.
    class Component {
        // ### Constructeur de la classe *Composant*
        // Le constructeur de cette classe prend en paramètre l'objet
        // propriétaire du composant, et l'assigne au membre `owner`.
        constructor(owner) {
            this.owner = owner;
            this._enabled = true;
        }
        // ### Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés. Cette
        // méthode peut retourner une promesse.
        create(desc) {
        }
        // ### Méthode *setup*
        // Cette méthode est appelée pour configurer le composant après
        // que tous les composants d'un objet aient été créés. Cette
        // méthode peut retourner une promesse.
        setup(descr) {
        }
        // ## Accesseur *enabled*
        // L'accesseur *enabled* active ou désactive le composant, et appelle
        // une méthode en réponse si l'état a changé.
        get enabled() {
            return this._enabled;
        }
        set enabled(val) {
            if (this.enabled === val) {
                return;
            }
            this._enabled = val;
            if (this.enabled) {
                this.onEnabled();
            }
            else {
                this.onDisabled();
            }
        }
        enable(val) {
            this.enabled = val;
        }
        // ## Méthode *onEnabled*
        // La méthode *onEnabled* est appelée quand l'objet passe de l'état
        // activé à désactivé.
        onEnabled() { }
        // ## Méthode *onDisabled*
        // La méthode *onDisabled* est appelée quand l'objet passe de l'état
        // désactivé à activé.
        onDisabled() { }
        static findComponent(name) {
            if (typeof (name) !== 'string')
                return name;
            const tokens = name.split('.');
            const targetName = tokens[0];
            const compName = tokens[1];
            const target = scene_1.Scene.current.findObject(targetName);
            return target && target.getComponent(compName);
        }
    }
    exports.Component = Component;
});
// # Fonctions d'affichage
// Méthodes nécessaires pour charger et afficher
// des images à l'écran.
define("graphicsAPI", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // ## Variable *images*
    // Comprend une liste des images pré-chargées
    const images = {};
    // ## Méthode *init*
    // La méthode d'initialisation prend en paramètre le nom d'un objet de
    // type *canvas* de la page web où dessiner. On y extrait
    // et conserve alors une référence vers le contexte de rendu 3D.
    function init(canvasId) {
        exports.canvas = document.getElementById(canvasId);
        const gl = exports.canvas.getContext('webgl');
        if (!gl) {
            throw new Error('Impossible de récupérer le contexte WebGL!');
        }
        exports.context = gl;
        return exports.context;
    }
    exports.init = init;
    // ## Méthode *preloadImage*
    // Cette méthode instancie dynamiquement un objet du navigateur
    // afin qu'il la charge. Ce chargement se faisant de façon
    // asynchrone, on crée une [promesse](http://bluebirdjs.com/docs/why-promises.html)
    // qui sera [résolue](http://bluebirdjs.com/docs/api/new-promise.html)
    // lorsque l'image sera chargée.
    function preloadImage(name) {
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
    exports.preloadImage = preloadImage;
    // ## Méthode *loadImage*
    // Attends le téléchargement d'une image et la retourne dans
    // une promesse.
    function loadImage(name) {
        return preloadImage(name)
            .then(() => {
            return images[name];
        });
    }
    exports.loadImage = loadImage;
    // ## Méthode *requestFullScreen*
    // Méthode utilitaire pour mettre le canvas en plein écran.
    // Il existe plusieurs méthodes selon le navigateur, donc on
    // se doit de vérifier l'existence de celles-ci avant de les
    // appeler.
    //
    // À noter qu'un script ne peut appeler le basculement en plein
    // écran que sur une action explicite du joueur.
    function requestFullScreen() {
        const method = exports.canvas.requestFullscreen || exports.canvas.webkitRequestFullScreen || function () { };
        method.apply(exports.canvas);
    }
    exports.requestFullScreen = requestFullScreen;
});
define("system", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("displaySystem", ["require", "exports", "graphicsAPI", "scene"], function (require, exports, GraphicsAPI, scene_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // # Fonction *isDisplayComponent*
    // Vérifie si le composant est du type `IDisplayComponent``
    // Voir [la documentation de TypeScript](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
    function isDisplayComponent(arg) {
        return arg.display !== undefined;
    }
    // # Fonction *isCameraComponent*
    // Vérifie si le composant est du type `ICameraComponent``
    // Voir [la documentation de TypeScript](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
    function isCameraComponent(arg) {
        return arg.render !== undefined;
    }
    // # Classe *DisplaySystem*
    // Représente le système permettant de gérer l'affichage
    class DisplaySystem {
        // ## Constructeur
        // Initialise l'API graphique.
        constructor(canvasId) {
            GraphicsAPI.init(canvasId);
        }
        // Méthode *iterate*
        // Appelée à chaque tour de la boucle de jeu
        // Parcourt l'ensemble des entités via le patron de
        // conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception)).
        iterate(dT) {
            const displayComp = [];
            const cameraComp = [];
            const walkIterFn = (e) => this.walkFn(displayComp, cameraComp, e);
            let p = Promise.resolve();
            return scene_2.Scene.current.walk(walkIterFn)
                .then(() => {
                displayComp.forEach((c) => {
                    p = p.then(() => c.display(dT));
                });
                cameraComp.forEach((c) => {
                    p = p.then(() => c.render(dT));
                });
                return p;
            });
        }
        // Méthode *walkFn*
        // Liste chaque composant respectant les interfaces
        // `IDisplayComponent` et `ICameraComponent`
        walkFn(displayComp, cameraComp, entity) {
            entity.walkComponent((comp) => {
                if (isDisplayComponent(comp) && comp.enabled)
                    displayComp.push(comp);
                if (isCameraComponent(comp) && comp.enabled)
                    cameraComp.push(comp);
            });
            return Promise.resolve();
        }
    }
    exports.DisplaySystem = DisplaySystem;
});
define("components/compositorComponent", ["require", "exports", "components/component", "graphicsAPI", "utils"], function (require, exports, component_1, GraphicsAPI, Utils) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let GL;
    // ## Fonction *compileShader*
    // Cette fonction permet de créer un shader du type approprié
    // (vertex ou fragment) à partir de son code GLSL.
    function compileShader(source, type) {
        const shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert(`Erreur en compilant le shader: ${GL.getShaderInfoLog(shader)}`);
            return;
        }
        return shader;
    }
    class CompositorComponent extends component_1.Component {
        // ## Méthode *compose*
        // Cette méthode est appelée afin d'appliquer un effet sur la caméra
        compose(texture) {
            return texture;
        }
        // ## Méthode *setup*
        // Charge les shaders et configure le composant
        setup(descr) {
            GL = GraphicsAPI.context;
            let vs;
            let fs;
            return Utils.loadAsync(descr.vertexShader, 'x-shader/x-vertex')
                .then((content) => {
                vs = compileShader(content.responseText, GL.VERTEX_SHADER);
                return Utils.loadAsync(descr.fragmentShader, 'x-shader/x-fragment');
            })
                .then((content) => {
                fs = compileShader(content.responseText, GL.FRAGMENT_SHADER);
                this.shader = GL.createProgram();
                GL.attachShader(this.shader, vs);
                GL.attachShader(this.shader, fs);
                GL.linkProgram(this.shader);
                if (!GL.getProgramParameter(this.shader, GL.LINK_STATUS)) {
                    alert(`Initialisation du shader échouée: ${GL.getProgramInfoLog(this.shader)}`);
                }
                GL.useProgram(this.shader);
            });
        }
    }
    exports.CompositorComponent = CompositorComponent;
});
define("components/positionComponent", ["require", "exports", "components/component", "gl-matrix"], function (require, exports, component_2, gl_matrix_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function isVec3(arg) {
        return arg.buffer !== undefined;
    }
    class PositionComponent extends component_2.Component {
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés. Les valeurs
        // omises prennent la valeur 0 par défaut.
        create(descr) {
            if (isVec3(descr)) {
                this.local = gl_matrix_1.vec3.clone(descr);
            }
            else {
                this.local = gl_matrix_1.vec3.fromValues(descr.x || 0, descr.y || 0, descr.z || 0);
            }
        }
        // ## Propriété *worldPosition*
        // Cette propriété combine les transformations des parents afin
        // de trouver la position absolue de l'objet dans le monde.
        get worldPosition() {
            const pos = gl_matrix_1.vec3.clone(this.local);
            const parentPosition = this.owner.parent ? this.owner.parent.getComponent('Position') : undefined;
            if (parentPosition) {
                const parentWorld = parentPosition.worldPosition;
                gl_matrix_1.vec3.add(pos, pos, parentWorld);
            }
            return pos;
        }
        // ## Méthode *translate*
        // Applique une translation sur l'objet.
        translate(delta) {
            gl_matrix_1.vec3.add(this.local, this.local, delta);
        }
        // ## Méthode *clamp*
        // Cette méthode limite la position de l'objet dans une zone
        // donnée.
        clamp(xMin = Number.MIN_VALUE, xMax = Number.MAX_VALUE, yMin = Number.MIN_VALUE, yMax = Number.MAX_VALUE, zMin = Number.MIN_VALUE, zMax = Number.MAX_VALUE) {
            if (this.local[0] < xMin) {
                this.local[0] = xMin;
            }
            if (this.local[0] > xMax) {
                this.local[0] = xMax;
            }
            if (this.local[1] < yMin) {
                this.local[1] = yMin;
            }
            if (this.local[1] > yMax) {
                this.local[1] = yMax;
            }
            if (this.local[2] < zMin) {
                this.local[2] = zMin;
            }
            if (this.local[2] > zMax) {
                this.local[2] = zMax;
            }
        }
    }
    exports.PositionComponent = PositionComponent;
});
define("components/cameraComponent", ["require", "exports", "components/component", "graphicsAPI", "gl-matrix"], function (require, exports, component_3, GraphicsAPI, gl_matrix_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let GL;
    class CameraComponent extends component_3.Component {
        constructor() {
            super(...arguments);
            this.compositors = [];
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés. On y
        // configure globalement le tests de profondeur, la couleur de
        // l'arrière-plan et la zone de rendu.
        create(descr) {
            GL = GraphicsAPI.context;
            CameraComponent.current = this;
            this.clearColor = descr.color;
            this.viewHeight = descr.height;
            this.near = descr.near;
            this.far = descr.far;
            const canvas = this.canvas = GraphicsAPI.canvas;
            GL.disable(GL.DEPTH_TEST);
            GL.depthFunc(GL.LEQUAL);
            GL.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearColor.a);
            GL.viewport(0, 0, canvas.width, canvas.height);
            this.rttFrameBuffer = GL.createFramebuffer();
            GL.bindFramebuffer(GL.FRAMEBUFFER, this.rttFrameBuffer);
            this.renderTexture = GL.createTexture();
            GL.bindTexture(GL.TEXTURE_2D, this.renderTexture);
            GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, canvas.width, canvas.height, 0, GL.RGBA, GL.UNSIGNED_BYTE, null);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
            this.renderBuffer = GL.createRenderbuffer();
            GL.bindRenderbuffer(GL.RENDERBUFFER, this.renderBuffer);
            GL.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, canvas.width, canvas.height);
            GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, this.renderTexture, 0);
            GL.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, this.renderBuffer);
            GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
            GL.bindTexture(GL.TEXTURE_2D, null);
            GL.bindRenderbuffer(GL.RENDERBUFFER, null);
            GL.bindFramebuffer(GL.FRAMEBUFFER, null);
        }
        // ## Méthode *setup*
        // La méthode *setup* récupère les compositeurs spécifiés pour
        // la caméra.
        setup(descr) {
            descr.compositors.forEach((comp) => {
                const compositor = component_3.Component.findComponent(comp);
                if (compositor)
                    this.compositors.push(compositor);
            });
        }
        // ## Méthode *render*
        // La méthode *render* est appelée une fois par itération de
        // la boucle de jeu. La caméra courante est conservée, et on
        // efface la zone de rendu. La zone de rendu sera à nouveau
        // remplie par les appels aux méthodes *display* des autres
        // composants.
        render() {
            CameraComponent.current = this;
            let rt = this.renderTexture;
            this.compositors.forEach((comp) => {
                if (comp.enabled) {
                    rt = comp.compose(rt);
                }
            });
            GL.bindFramebuffer(GL.FRAMEBUFFER, this.rttFrameBuffer);
            GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        }
        // ## Accesseur *projection*
        // Cet accesseur retourne la matrice de projection de la caméra.
        // Elle est utilisée pour configurer le shader par le composant
        // SpriteSheetComponent.
        get projection() {
            const ratio = this.canvas.width / this.canvas.height;
            const viewWidth = ratio * this.viewHeight;
            const position = this.owner.getComponent('Position').worldPosition;
            const ortho = gl_matrix_2.mat4.create();
            return gl_matrix_2.mat4.ortho(ortho, position[0] - viewWidth, position[0] + viewWidth, -position[1] + this.viewHeight, -position[1] - this.viewHeight, position[2] + this.near, position[2] + this.far);
        }
    }
    // ## Propriété statique *current*
    // Pour simplifier l'exercice, la caméra courante est stockée
    // dans ce champ. Elle est utilisée par le composant SpriteSheetComponent
    CameraComponent.current = null;
    exports.CameraComponent = CameraComponent;
});
define("components/textureComponent", ["require", "exports", "components/component", "components/cameraComponent", "graphicsAPI", "utils", "gl-matrix"], function (require, exports, component_4, cameraComponent_1, GraphicsAPI, Utils, gl_matrix_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let GL;
    class TextureComponent extends component_4.Component {
        // ## Méthode *create*
        create(descr) {
            GL = GraphicsAPI.context;
            // Variable locale pour les shaders
            let vs;
            let fs;
            // On charge l'image de façon asynchrone
            return GraphicsAPI.loadImage(descr.texture)
                .then((image) => {
                this.image = image;
                // On crée une texture WebGL à partir de l'image chargée
                this.texture = GL.createTexture();
                GL.bindTexture(GL.TEXTURE_2D, this.texture);
                GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
                GL.bindTexture(GL.TEXTURE_2D, null);
                // On charge ensuite le vertex shader
                return Utils.loadAsync(descr.vertexShader, 'x-shader/x-vertex');
            })
                .then((content) => {
                vs = this.compileShader(content.responseText, GL.VERTEX_SHADER);
                // et on fait de même pour le fragment shader
                return Utils.loadAsync(descr.fragmentShader, 'x-shader/x-fragment');
            })
                .then((content) => {
                fs = this.compileShader(content.responseText, GL.FRAGMENT_SHADER);
                // On attache les deux shaders ensemble
                this.shader = GL.createProgram();
                GL.attachShader(this.shader, vs);
                GL.attachShader(this.shader, fs);
                GL.linkProgram(this.shader);
                if (!GL.getProgramParameter(this.shader, GL.LINK_STATUS)) {
                    alert(`Initialisation du shader échouée:  ${GL.getProgramInfoLog(this.shader)}`);
                }
                GL.useProgram(this.shader);
                // On récupère des références vers les paramètres configurables des shaders
                this.vertexPositionAttrib = GL.getAttribLocation(this.shader, 'aVertexPosition');
                this.textureCoordAttrib = GL.getAttribLocation(this.shader, 'aTextureCoord');
                this.pUniform = GL.getUniformLocation(this.shader, 'uPMatrix');
                this.mvUniform = GL.getUniformLocation(this.shader, 'uMVMatrix');
                this.uSampler = GL.getUniformLocation(this.shader, 'uSampler');
            });
        }
        // ## Méthode *bind*
        // La méthode *bind* choisit le shader et y assigne les
        // bonnes valeurs.
        bind() {
            // On commence par choisir le shader à utiliser
            GL.useProgram(this.shader);
            // On indique au vertex shader la position des paramètres
            // dans le tableau de mémoire (vertex buffer object).
            const stride = TextureComponent.vertexSize * TextureComponent.floatSize;
            GL.enableVertexAttribArray(this.vertexPositionAttrib);
            GL.enableVertexAttribArray(this.textureCoordAttrib);
            GL.vertexAttribPointer(this.vertexPositionAttrib, 3, GL.FLOAT, false, stride, 0);
            GL.vertexAttribPointer(this.textureCoordAttrib, 2, GL.FLOAT, false, stride, 3 * TextureComponent.floatSize);
            // On configure les matrices de transformation
            GL.uniformMatrix4fv(this.pUniform, false, cameraComponent_1.CameraComponent.current.projection);
            const identity = gl_matrix_3.mat4.create();
            GL.uniformMatrix4fv(this.mvUniform, false, identity);
            // On assigne la texture à utiliser pour le fragment shader
            GL.activeTexture(GL.TEXTURE0);
            GL.bindTexture(GL.TEXTURE_2D, this.texture);
            GL.uniform1i(this.uSampler, 0);
            // On active la semi-transparence
            GL.enable(GL.BLEND);
            GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
        }
        // ## Méthode *unbind*
        // Nettoie les paramètres WebGL
        unbind() {
            GL.disableVertexAttribArray(this.vertexPositionAttrib);
            GL.disableVertexAttribArray(this.textureCoordAttrib);
        }
        // ## Fonction *compileShader*
        // Cette fonction permet de créer un shader du type approprié
        // (vertex ou fragment) à partir de son code GLSL.
        compileShader(source, type) {
            const shader = GL.createShader(type);
            GL.shaderSource(shader, source);
            GL.compileShader(shader);
            if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
                alert(`Erreur en compilant le shader: ${GL.getShaderInfoLog(shader)}`);
                return;
            }
            return shader;
        }
    }
    // ## Constante *vertexSize*
    // Cette constante représente le nombre d'éléments d'un vertex,
    // soit 3 valeurs pour la position, et 2 pour la texture
    TextureComponent.vertexSize = 3 + 2; // position(3d), texture(2d)
    // ## Constante *floatSize*
    // Cette constante représente le nombre d'octets dans une valeur
    // flottante. On s'en sert pour calculer la position des éléments
    // de vertex dans des tableaux de mémoire bruts.
    TextureComponent.floatSize = 4; // 32 bits
    exports.TextureComponent = TextureComponent;
});
define("components/spriteSheetComponent", ["require", "exports", "components/textureComponent", "utils"], function (require, exports, textureComponent_1, Utils) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SpriteSheetComponent extends textureComponent_1.TextureComponent {
        // ## Méthode *create*
        create(descr) {
            // On charge l'image et les shaders
            return super.create(descr)
                .then(() => {
                // On charge ensuite le fichier de description de l'image,
                // qui contient l'emplacement et les dimensions des sprites
                // contenues sur la feuille.
                return Utils.loadJSON(descr.description);
            })
                .then((rawDescription) => {
                this.parseDescription(rawDescription);
            });
        }
        // ## Méthode *parseDescription*
        // Cette méthode extrait la description de la feuille de sprite.
        parseDescription(rawDescription) {
            this.sprites = rawDescription.frames;
            Object.keys(rawDescription.frames).forEach((k) => {
                const v = rawDescription.frames[k];
                v.uv = this.normalizeUV(v.frame, rawDescription.meta.size);
            });
        }
        // ## Fonction *normalizeUV*
        // La fonction *normalizeUV* retourne la position relative, entre
        // 0 et 1, des rectangles comportant les sprites de la feuille.
        normalizeUV(frame, size) {
            return {
                x: frame.x / size.w,
                y: frame.y / size.h,
                w: frame.w / size.w,
                h: frame.h / size.h,
            };
        }
    }
    exports.SpriteSheetComponent = SpriteSheetComponent;
});
define("components/backgroundLoaderComponent", ["require", "exports", "components/component", "scene", "utils"], function (require, exports, component_5, scene_3, Utils) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class BackgroundLoaderComponent extends component_5.Component {
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.entryMap = descr.entryMap;
            this.scale = descr.scale;
        }
        // ## Méthode *setup*
        // Cette méthode est responsable d'instancier les différents
        // objets contenant des sprites. La promesse n'est résolue que
        // lorsque toutes les sprites ont été créées.
        setup(descr) {
            const spriteSheet = component_5.Component.findComponent(descr.spriteSheet);
            return Utils.loadAsync(descr.description, 'text/plain')
                .then((content) => {
                const p = [];
                const lines = content.responseText.split(/\r?\n/);
                for (let row = 0; row < lines.length; ++row) {
                    const chars = lines[row].split('');
                    for (let col = 0; col < chars.length; ++col) {
                        const char = chars[col];
                        const entry = this.entryMap[char];
                        if (!entry) {
                            continue;
                        }
                        const pItem = scene_3.Scene.current.createChild({
                            components: {
                                Position: {
                                    x: col * this.scale,
                                    y: row * this.scale,
                                    z: row * 0.01,
                                },
                                Sprite: {
                                    spriteSheet: spriteSheet,
                                    spriteName: entry.spriteName,
                                    isAnimated: entry.isAnimated,
                                    frameSkip: entry.frameSkip,
                                },
                            }
                        }, `${col}-${row}`, this.owner);
                        p.push(pItem);
                    }
                }
                return Promise.all(p);
            });
        }
    }
    exports.BackgroundLoaderComponent = BackgroundLoaderComponent;
});
define("timing", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Timing {
        constructor(dT, frame) {
            this.dT = dT;
            this.frame = frame;
            this.now = new Date();
        }
    }
    exports.Timing = Timing;
});
define("logicSystem", ["require", "exports", "scene", "timing"], function (require, exports, scene_4, timing_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // # Fonction *isLogicComponent*
    // Vérifie si le composant est du type `ILogicComponent``
    // Voir [la documentation de TypeScript](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
    function isLogicComponent(arg) {
        return arg.update !== undefined;
    }
    // # Classe *LogicSystem*
    // Représente le système permettant de mettre à jour la logique
    class LogicSystem {
        constructor() {
            this.frameCount = 0;
        }
        // Méthode *iterate*
        // Appelée à chaque tour de la boucle de jeu
        // Parcourt l'ensemble des entités via le patron de
        // conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception)).
        iterate(dT) {
            const timing = new timing_1.Timing(dT, this.frameCount++);
            const components = [];
            const walkIterFn = (e) => this.walkFn(components, e);
            return scene_4.Scene.current.walk(walkIterFn)
                .then(() => {
                const p = [];
                components.forEach((c) => p.push(c.update(timing)));
                return Promise.all(p);
            });
        }
        // Méthode *walkFn*
        // Liste chaque composant respectant l'interface `ILogicComponent`
        walkFn(components, entity) {
            entity.walkComponent((comp) => {
                if (isLogicComponent(comp) && comp.enabled)
                    components.push(comp);
            });
            return Promise.resolve();
        }
    }
    exports.LogicSystem = LogicSystem;
});
define("components/spriteComponent", ["require", "exports", "components/component", "components/textureComponent", "graphicsAPI"], function (require, exports, component_6, textureComponent_2, GraphicsAPI) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let GL;
    class SpriteComponent extends component_6.Component {
        constructor() {
            super(...arguments);
            this.animationEndedEvent = [];
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            let ref;
            this.spriteName = descr.spriteName || '(unknown)';
            this.isAnimated = (ref = descr.isAnimated) !== undefined ? ref : false;
            this.frameSkip = (ref = descr.frameSkip) !== undefined ? ref : 1;
            this.animWait = (ref = descr.animWait) !== undefined ? ref : 0;
            this.animationFrame = 1;
            this.animWaitCounter = this.animWait;
        }
        // ## Méthode *setup*
        setup(descr) {
            GL = GraphicsAPI.context;
            // On récupère ici la feuille de sprite correspondant à ce composant.
            this.spriteSheet = component_6.Component.findComponent(descr.spriteSheet);
            // On crée ici un tableau de 4 vertices permettant de représenter
            // le rectangle à afficher.
            this.vertexBuffer = GL.createBuffer();
            GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
            this.vertices = new Float32Array(4 * textureComponent_2.TextureComponent.vertexSize);
            GL.bufferData(GL.ARRAY_BUFFER, this.vertices, GL.DYNAMIC_DRAW);
            // On crée ici un tableau de 6 indices, soit 2 triangles, pour
            // représenter quels vertices participent à chaque triangle:
            // ```
            // 0    1
            // +----+
            // |\   |
            // | \  |
            // |  \ |
            // |   \|
            // +----+
            // 3    2
            // ```
            this.indexBuffer = GL.createBuffer();
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);
            GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, indices, GL.DYNAMIC_DRAW);
            // Et on initialise le contenu des vertices
            this.updateMesh();
        }
        // ## Méthode *update*
        // Cette méthode met à jour l'animation de la sprite, si il
        // y a lieu, et met à jour le contenu des vertices afin de tenir
        // compte des changements de position et autres.
        update(timing) {
            if (this.isAnimated) {
                if (this.animWaitCounter > 0) {
                    this.animWaitCounter--;
                }
                else if ((timing.frame % this.frameSkip) === 0) {
                    this.updateMesh();
                }
            }
            this.updateComponents(this.descr);
        }
        // ## Méthode *display*
        // La méthode *display* choisit le shader et la texture appropriée
        // via la méthode *bind* de la feuille de sprite, sélectionne le
        // tableau de vertices et d'indices et fait l'appel de rendu.
        display() {
            // GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
            // GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            // this.spriteSheet.bind();
            // GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0); 
            // this.spriteSheet.unbind();
        }
        // ## Méthode *updateMesh*
        // Cette méthode met à jour les informations relatives à la sprite
        // à afficher.
        updateMesh() {
            const spriteName = this.isAnimated ? this.findNextFrameName() : this.spriteName;
            if (!this.spriteSheet.sprites[spriteName]) {
                console.error(spriteName, this.spriteName, this.owner);
                return;
            }
            this.descr = this.spriteSheet.sprites[spriteName];
            this.spriteSize = this.descr.sourceSize;
        }
        // ## Fonction *findNextFrameName*
        // La fonction *findNextFrameName* détermine le nom de la sprite
        // à afficher dans une animation, et déclenche des événements
        // enregistrés si on atteint la fin de l'animation.
        findNextFrameName() {
            const animationSprite = `${this.spriteName}${this.animationFrame}`;
            if (this.spriteSheet.sprites[animationSprite]) {
                this.animationFrame++;
                return animationSprite;
            }
            if (this.animationFrame === 1) {
                return this.spriteName;
            }
            else {
                this.animationFrame = 1;
                this.animWaitCounter = this.animWait;
                this.animationEndedEvent.forEach((e) => {
                    e();
                });
                return this.findNextFrameName();
            }
        }
        // ## Méthode *updateComponents*
        // Cette méthode met à jour le contenu de chaque vertex, soient
        // leurs position et les coordonnées de texture, en tenant compte
        // des transformations et de la sprite courante.
        updateComponents(descr) {
            const position = this.owner.getComponent('Position').worldPosition;
            const z = position[2];
            const xMin = position[0];
            const xMax = xMin + descr.frame.w;
            const yMax = position[1];
            const yMin = yMax - descr.frame.h;
            const uMin = descr.uv.x;
            const uMax = uMin + descr.uv.w;
            const vMin = descr.uv.y;
            const vMax = vMin + descr.uv.h;
            const v = [
                xMin, yMin, z, uMin, vMin,
                xMax, yMin, z, uMax, vMin,
                xMax, yMax, z, uMax, vMax,
                xMin, yMax, z, uMin, vMax,
            ];
            let offset = 0;
            this.vertices.set(v, offset);
            GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
            GL.bufferSubData(GL.ARRAY_BUFFER, offset, this.vertices);
        }
        getVertices() {
            return this.vertices;
        }
    }
    exports.SpriteComponent = SpriteComponent;
});
define("components/rectangle", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Rectangle {
        // ### Constructeur de la classe *Rectangle*
        // Le constructeur de cette classe prend en paramètre un
        // objet pouvant définir soit le centre et la taille du
        // rectangle (`x`, `y`, `width` et `height`) ou les côtés
        // de celui-ci (`xMin`, `xMax`, `yMin` et `yMax`).
        constructor(descr) {
            const descrAlt = descr;
            this.xMin = descr.xMin || (descrAlt.x - descrAlt.width / 2);
            this.xMax = descr.xMax || (descrAlt.x + descrAlt.width / 2);
            this.yMin = descr.yMin || (descrAlt.y - descrAlt.height / 2);
            this.yMax = descr.yMax || (descrAlt.y + descrAlt.height / 2);
        }
        // ### Fonction *intersectsWith*
        // Cette fonction retourne *vrai* si ce rectangle et celui
        // passé en paramètre se superposent.
        intersectsWith(other) {
            return !((this.xMin >= other.xMax) ||
                (this.xMax <= other.xMin) ||
                (this.yMin >= other.yMax) ||
                (this.yMax <= other.yMin));
        }
    }
    exports.Rectangle = Rectangle;
});
define("components/colliderComponent", ["require", "exports", "components/component", "components/rectangle"], function (require, exports, component_7, rectangle_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // ## Variable *colliders*
    // On conserve ici une référence vers toutes les instances
    // de cette classe, afin de déterminer si il y a collision.
    const colliders = [];
    class ColliderComponent extends component_7.Component {
        constructor() {
            super(...arguments);
            this.active = true;
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.flag = descr.flag;
            this.mask = descr.mask;
            this.size = descr.size;
        }
        // ## Méthode *setup*
        // Si un type *handler* est défini, on y appellera une méthode
        // *onCollision* si une collision est détectée sur cet objet.
        // On stocke également une référence à l'instance courante dans
        // le tableau statique *colliders*.
        setup(descr) {
            if (descr.handler) {
                this.handler = this.owner.getComponent(descr.handler);
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
                    this.handler.onCollision(c);
                }
            });
        }
        // ## Propriété *area*
        // Cette fonction calcule l'aire courante de la zone de
        // collision, après avoir tenu compte des transformations
        // effectuées sur les objets parent.
        get area() {
            const position = this.owner.getComponent('Position').worldPosition;
            return new rectangle_1.Rectangle({
                x: position[0],
                y: position[1],
                width: this.size.w,
                height: this.size.h,
            });
        }
    }
    exports.ColliderComponent = ColliderComponent;
});
define("components/chickenComponent", ["require", "exports", "components/component", "scene", "gl-matrix"], function (require, exports, component_8, scene_5, gl_matrix_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let dropId = 0;
    class ChickenComponent extends component_8.Component {
        constructor() {
            super(...arguments);
            this.dropped = false;
            this.distance = 0;
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.target = gl_matrix_4.vec3.fromValues(descr.target.x, descr.target.y, 0);
            this.rupeeTemplate = descr.rupeeTemplate;
            this.heartAttackChance = descr.heartAttackChance;
            this.heartTemplate = descr.heartTemplate;
            this.attack = descr.attack;
        }
        // ## Méthode *setup*
        // Cette méthode détermine la trajectoire du poulet et configure
        // la sprite à utiliser pour son affichage.
        setup() {
            const position = this.owner.getComponent('Position');
            this.velocity = gl_matrix_4.vec3.create();
            gl_matrix_4.vec3.subtract(this.velocity, this.target, position.local);
            gl_matrix_4.vec3.normalize(this.velocity, this.velocity);
            gl_matrix_4.vec3.scale(this.velocity, this.velocity, Math.random() * 3 + 2);
            const sprite = this.owner.getComponent('Sprite');
            const dir = (this.velocity[0] > 0) ? 'R' : 'L';
            sprite.spriteName = `C${dir}`;
        }
        // ## Méthode *update*
        // La méthode *update* met à jour la position du poulet. Si il
        // a atteint sa cible, il laisse tomber un rubis. Le poulet est
        // automatiquement détruit si il a parcouru une distance trop
        // grande (il sera déjà en dehors de l'écran).
        update() {
            const position = this.owner.getComponent('Position');
            const targetDistanceSq = gl_matrix_4.vec3.squaredDistance(this.target, position.local);
            position.translate(this.velocity);
            const newTargetDistanceSq = gl_matrix_4.vec3.squaredDistance(this.target, position.local);
            if ((!this.dropped) && (newTargetDistanceSq > targetDistanceSq)) {
                this.drop(this.rupeeTemplate, dropId++);
            }
            this.distance += gl_matrix_4.vec3.length(this.velocity);
            if (this.distance > 500) {
                this.owner.parent.removeChild(this.owner);
            }
        }
        // ## Méthode *drop*
        // Cette méthode instancie un objet au même endroit que le
        // poulet.
        drop(template, id) {
            const position = this.owner.getComponent('Position');
            template.components.Position = position.local;
            template.components.Sprite.spriteSheet = this.owner.getComponent('Sprite').spriteSheet;
            return scene_5.Scene.current.createChild(template, id.toString(), this.owner.parent)
                .then((newObj) => {
                this.dropped = true;
            });
        }
        // ## Méthode *onAttack*
        // Cette méthode est appelée quand le poulet se fait attaquer
        onAttack() {
            const toDrop = (Math.random() < this.heartAttackChance) ? this.heartTemplate : this.rupeeTemplate;
            this.drop(toDrop, dropId++);
            const collider = this.owner.getComponent('Collider');
            collider.enabled = false;
            this.velocity[0] *= -1;
            const sprite = this.owner.getComponent('Sprite');
            const dir = (this.velocity[0] > 0) ? 'R' : 'L';
            sprite.spriteName = `C${dir}`;
        }
    }
    exports.ChickenComponent = ChickenComponent;
});
define("components/chickenSpawnerComponent", ["require", "exports", "components/component", "scene"], function (require, exports, component_9, scene_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ChickenSpawnerComponent extends component_9.Component {
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.sourceArea = descr.sourceArea;
            this.targetArea = descr.targetArea;
            this.spawnDelay = descr.spawnDelay;
            this.spawnWaitFactor = descr.spawnWaitFactor;
            this.chickenTemplate = descr.chickenTemplate;
        }
        // ## Méthode *setup*
        // Cette méthode est appelée pour configurer le composant après
        // que tous les composants d'un objet aient été créés.
        setup(descr) {
            this.spriteSheet = component_9.Component.findComponent(descr.spriteSheet);
        }
        // ## Méthode *update*
        // À chaque itération, on vérifie si on a attendu un délai
        // quelconque. Si c'est le cas, on génère un poulet, et on
        // réduit le temps d'attente.
        update(timing) {
            const spawnDelay = Math.floor(this.spawnDelay);
            if ((timing.frame % spawnDelay) === 0) {
                this.spawnDelay = Math.max(8, this.spawnDelay * this.spawnWaitFactor);
                return this.spawn(timing.frame);
            }
        }
        // ## Méthode *spawn*
        // Cette méthode crée un nouveau poulet. On configure son
        // apparition sur un rectangle autour de l'écran, et sa
        // cible sur l'aire de jeu.
        spawn(frame) {
            let x = 0;
            let y = 0;
            if (Math.floor(Math.random() * 2) === 0) {
                x = this.sourceArea.x;
                if (Math.floor(Math.random() * 2) === 0) {
                    x += this.sourceArea.w;
                }
                y = Math.random() * this.sourceArea.h + this.sourceArea.y;
            }
            else {
                y = this.sourceArea.y;
                if (Math.floor(Math.random() * 2) === 0) {
                    y += this.sourceArea.h;
                }
                x = Math.random() * this.sourceArea.w + this.sourceArea.x;
            }
            this.chickenTemplate.components.Chicken.target = {
                x: Math.random() * this.targetArea.w + this.targetArea.x,
                y: Math.random() * this.targetArea.h + this.targetArea.y,
            };
            this.chickenTemplate.components.Position = {
                x: x,
                y: y,
                z: 0,
            };
            this.chickenTemplate.components.Sprite.spriteSheet = this.spriteSheet;
            return scene_6.Scene.current.createChild(this.chickenTemplate, frame.toString(), this.owner);
        }
    }
    exports.ChickenSpawnerComponent = ChickenSpawnerComponent;
});
define("eventTrigger", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // # Classe *EventTrigger*
    // Classe utilitaire pour appeler des méthodes en réaction
    // à des événements.
    class EventTrigger {
        constructor() {
            this.handlers = new Map();
            this.autoIndex = 0;
        }
        // ## Méthode *add*
        // Ajoute une méthode à appeler lors du déclenchement de
        // l'événement.
        add(instance, method, name, context) {
            if (!name) {
                name = (this.autoIndex++).toString();
            }
            this.handlers.set(name, {
                instance: instance,
                method: method,
                context: context,
            });
            return name;
        }
        // ## Méthode *remove*
        // Supprime une méthode du tableau de méthodes à appeler.
        remove(name) {
            this.handlers.delete(name);
        }
        // ## Méthode *trigger*
        // Déclenche les méthodes enregistrées.
        trigger(...params) {
            this.handlers.forEach((handler) => {
                if (handler.context)
                    params.push(handler.context);
                let method = handler.method;
                if (typeof (method) === 'string')
                    method = handler.instance[method];
                method.apply(handler.instance, params);
            });
        }
    }
    exports.EventTrigger = EventTrigger;
});
define("components/countdownComponent", ["require", "exports", "components/component", "eventTrigger", "graphicsAPI", "scene"], function (require, exports, component_10, eventTrigger_1, GraphicsAPI, scene_7) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class CountdownComponent extends component_10.Component {
        constructor() {
            super(...arguments);
            this.handler = new eventTrigger_1.EventTrigger();
            this.sprites = [];
            this.index = -1;
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.sprites = [];
            this.sprites = descr.sprites;
            this.delay = descr.delay;
            this.spriteTemplate = descr.spriteTemplate;
            return this.preloadSprites();
        }
        // ## Méthode *setup*
        // Cette méthode est appelée pour configurer le composant après
        // que tous les composants d'un objet aient été créés.
        setup(descr) {
            if (descr.handler) {
                const tokens = descr.handler.split('.');
                this.handler.add(this.owner.getComponent(tokens[0]), tokens[1]);
            }
        }
        // ## Méthode *update*
        // À chaque itération, on vérifie si on a attendu le délai
        // désiré, et on change d'image si c'est le cas.
        update(timing) {
            if ((timing.now.getTime() - this.shownTime) < this.delay) {
                return;
            }
            this.index++;
            if (this.current) {
                this.owner.removeChild(this.current);
                delete this.current;
            }
            if (this.index >= this.sprites.length) {
                this.handler.trigger();
                this.enabled = false;
            }
            else {
                return this.showImage();
            }
        }
        // ## Méthode *preloadSprites*
        // Pré-charge les sprites pour qu'elles soient immédiatement
        // disponibles quand on voudra les afficher.
        preloadSprites() {
            const p = [];
            this.sprites.forEach((s) => {
                p.push(GraphicsAPI.preloadImage(s));
            });
            return Promise.all(p);
        }
        // ## Méthode *showImage*
        // Affiche une image parmi les sprites désirées, si il y en
        // a encore à afficher.
        showImage() {
            this.shownTime = (new Date()).getTime();
            return this.showNamedImage(this.sprites[this.index]);
        }
        // ## Méthode *showNamedImage*
        // Affiche une image, directement à partir de son nom
        showNamedImage(textureName) {
            this.spriteTemplate.components.RawSprite.texture = textureName;
            return scene_7.Scene.current.createChild(this.spriteTemplate, 'sprite', this.owner)
                .then((newSprite) => {
                this.current = newSprite;
            });
        }
    }
    exports.CountdownComponent = CountdownComponent;
});
define("components/enablerComponent", ["require", "exports", "components/component", "eventTrigger"], function (require, exports, component_11, eventTrigger_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class EnablerComponent extends component_11.Component {
        constructor() {
            super(...arguments);
            this.eventTargets = new eventTrigger_2.EventTrigger();
        }
        // ## Méthode *setup*
        // Cette méthode est appelée pour configurer le composant après
        // que tous les composants d'un objet aient été créés.
        setup(descr) {
            Object.keys(descr.onStart).forEach((name) => {
                const enabled = descr.onStart[name];
                const target = component_11.Component.findComponent(name);
                target.enabled = enabled;
            });
            Object.keys(descr.onEvent).forEach((name) => {
                const enabled = descr.onEvent[name];
                const target = component_11.Component.findComponent(name);
                this.eventTargets.add(target, 'enable', undefined, enabled);
            });
        }
        // ## Méthode *onEvent*
        // Active ou désactive les composants en réaction à un événement.
        onEvent() {
            this.eventTargets.trigger();
        }
    }
    exports.EnablerComponent = EnablerComponent;
});
define("components/heartComponent", ["require", "exports", "components/component"], function (require, exports, component_12) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class HeartComponent extends component_12.Component {
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.heal = descr.heal;
            this.lifetime = descr.lifetime;
        }
        // ## Méthode *setup*
        // Cette méthode est appelée pour configurer le composant après
        // que tous les composants d'un objet aient été créés.
        setup() {
            this.start = (new Date()).getTime();
        }
        // ## Méthode *update*
        // La méthode *update* de chaque composant est appelée une fois
        // par itération de la boucle de jeu.
        update(timing) {
            const elapsed = timing.now.getTime() - this.start;
            if (elapsed > this.lifetime) {
                this.owner.active = false;
                this.owner.parent.removeChild(this.owner);
            }
        }
    }
    exports.HeartComponent = HeartComponent;
});
define("components/inputComponent", ["require", "exports", "components/component"], function (require, exports, component_13) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // ## Variable *keyPressed*
    // Tableau associatif vide qui contiendra l'état courant
    // des touches du clavier.
    const keyPressed = {};
    // ## Méthode *setupKeyboardHandler*
    // Cette méthode enregistre des fonctions qui seront
    // appelées par le navigateur lorsque l'utilisateur appuie
    // sur des touches du clavier. On enregistre alors si la touche
    // est appuyée ou relâchée dans le tableau `keyPressed`.
    //
    // On utilise la propriété `code` de l'événement, qui est
    // indépendant de la langue du clavier (ie.: WASD vs ZQSD)
    //
    // Cette méthode est appelée lors du chargement de ce module.
    function setupKeyboardHandler() {
        document.addEventListener('keydown', (evt) => {
            keyPressed[evt.code] = true;
        }, false);
        document.addEventListener('keyup', (evt) => {
            keyPressed[evt.code] = false;
        }, false);
    }
    class InputComponent extends component_13.Component {
        constructor() {
            super(...arguments);
            this.isLocal = true;
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.symbols = descr.symbols;
        }
        listSymbols() {
            return Object.keys(this.symbols);
        }
        // ## Fonction *getKey*
        // Cette méthode retourne une valeur correspondant à un symbole défini.
        //
        // Si on le voulait, on pourrait substituer cette implémentation
        // par clavier par une implémentation de l'[API Gamepad.](https://developer.mozilla.org/fr/docs/Web/Guide/API/Gamepad)
        getKey(symbol) {
            if (keyPressed[this.symbols[symbol]]) {
                return true;
            }
            return false;
        }
    }
    exports.InputComponent = InputComponent;
    // Configuration de la capture du clavier au chargement du module.
    // On met dans un bloc `try/catch` afin de pouvoir exécuter les
    // tests unitaires en dehors du navigateur.
    try {
        setupKeyboardHandler();
    }
    catch (e) { }
});
define("components/layerComponent", ["require", "exports", "components/component", "components/spriteComponent", "graphicsAPI"], function (require, exports, component_14, spriteComponent_1, GraphicsAPI) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let GL;
    // # Classe *LayerComponent*
    // Ce composant représente un ensemble de sprites qui
    // doivent normalement être considérées comme étant sur un
    // même plan.
    class LayerComponent extends component_14.Component {
        constructor() {
            super(...arguments);
            this.vertex = new Float32Array();
            this.indices = new Uint32Array();
        }
        // ## Méthode *display*
        // La méthode *display* est appelée une fois par itération
        // de la boucle de jeu.
        display(dT) {
            const layerSprites = this.listSprites();
            if (layerSprites.length === 0) {
                return;
            }
            GL = GraphicsAPI.context;
            this.vertexBuffer = GL.createBuffer();
            this.indexBuffer = GL.createBuffer();
            const spriteSheet = layerSprites[0].spriteSheet;
            this.setupVerticesAndIndices(layerSprites);
            this.vertex = new Float32Array(this.verticesArray);
            GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
            GL.bufferData(GL.ARRAY_BUFFER, this.vertex, GL.DYNAMIC_DRAW);
            this.indices = new Uint32Array(this.indicesArray);
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, this.indices, GL.DYNAMIC_DRAW);
            spriteSheet.bind();
            GL.drawElements(GL.TRIANGLES, this.indices.length, GL.UNSIGNED_SHORT, 0);
            spriteSheet.unbind();
        }
        setupVerticesAndIndices(layerSprites) {
            this.verticesArray = new Array();
            this.indicesArray = new Array();
            let i = 0;
            for (i; i < layerSprites.length; i++) {
                this.verticesArray.push(...layerSprites[i].getVertices());
                this.indicesArray.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i + 2, 4 * i + 3, 4 * i);
            }
        }
        // ## Fonction *listSprites*
        // Cette fonction retourne une liste comportant l'ensemble
        // des sprites de l'objet courant et de ses enfants.
        listSprites() {
            const sprites = [];
            this.getRecursiveSprites(this.owner, sprites);
            return sprites;
        }
        // ## Methode *getRecursiveSprites*
        // Cette méthode récursive ajoute à un tableau de SrpiteComponent
        // l'ensemble des sprites de l'entité passée en paramètre et de ses fils
        getRecursiveSprites(owner, sprites) {
            owner.walkChildren((child) => {
                if (!child.active)
                    return;
                child.walkComponent((comp) => {
                    if (comp instanceof spriteComponent_1.SpriteComponent && comp.enabled)
                        sprites.push(comp);
                });
                this.getRecursiveSprites(child, sprites);
            });
        }
    }
    exports.LayerComponent = LayerComponent;
});
define("components/textSpriteComponent", ["require", "exports", "components/component", "scene"], function (require, exports, component_15, scene_8) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // # Classe *TextSpriteComponent*
    var TextAlign;
    (function (TextAlign) {
        TextAlign["Left"] = "left";
        TextAlign["Right"] = "right";
    })(TextAlign || (TextAlign = {}));
    class TextSpriteComponent extends component_15.Component {
        constructor() {
            super(...arguments);
            this.sprites = [];
            this._text = [];
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.align = descr.align;
        }
        // ## Méthode *setup*
        // Cette méthode conserve la feuille de sprite comportant
        // les glyphes du texte, et met le texte à jour.
        setup(descr) {
            this.spriteSheet = component_15.Component.findComponent(descr.spriteSheet);
            return this.updateTextSprites();
        }
        // ## Propriété *text*
        // Cette propriété met à jour le texte affiché. On force tout
        // d'abord le paramètre à un type de chaîne de caractères,
        // et on ne met à jour que si le texte a changé.
        set text(text) {
            this.array = String(text).split('');
        }
        // ## Propriété *array*
        // Cette propriété met à jour le texte affiché, à partir d'un
        // tableau d'identifiants de sprites.
        set array(array) {
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
        updateTextSprites() {
            const oldSprites = this.sprites;
            this.sprites = [];
            let offset = 0;
            const dir = (this.align === TextAlign.Left) ? 1 : -1;
            let text = this._text.slice();
            if (this.align === TextAlign.Right) {
                text = text.reverse();
            }
            let p = Promise.resolve();
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
                p = p.then(() => scene_8.Scene.current.createChild(template, `${this._text}_${index}`, this.owner)
                    .then((newSpriteObj) => {
                    this.sprites.push(newSpriteObj);
                }));
            });
            return p.then(() => {
                oldSprites.forEach((s) => {
                    s.parent.removeChild(s);
                });
            });
        }
    }
    exports.TextSpriteComponent = TextSpriteComponent;
});
define("components/lifeComponent", ["require", "exports", "components/component", "eventTrigger"], function (require, exports, component_16, eventTrigger_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LifeComponent extends component_16.Component {
        constructor() {
            super(...arguments);
            this.deadEvent = new eventTrigger_3.EventTrigger();
            this.hurtEvent = new eventTrigger_3.EventTrigger();
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.max = descr.max;
            this.sprites = descr.sprites;
        }
        // ## Méthode *setup*
        // Cette méthode conserve le composant de texte qui affiche
        // la vie, et initialise sa valeur.
        setup(descr) {
            this.lifeSprite = component_16.Component.findComponent(descr.lifeSprite);
            this.value = descr.default;
        }
        // ## Propriété *value*
        // Cette méthode met à jour la vie et l'affichage de
        // cette dernière.
        get value() {
            return this._value;
        }
        set value(newVal) {
            if (newVal < 0) {
                newVal = 0;
            }
            if (newVal > this.max) {
                newVal = this.max;
            }
            if (newVal === 0) {
                this.deadEvent.trigger();
            }
            else if (newVal < this.value) {
                this.hurtEvent.trigger();
            }
            this._value = newVal;
            const hearts = [];
            for (let i = 0; i < this.max; ++i) {
                let sIndex = 0;
                if (i < this.value) {
                    sIndex = 1;
                }
                if (i + 1 <= this.value) {
                    sIndex = 2;
                }
                hearts.push(this.sprites[sIndex]);
            }
            this.lifeSprite.array = hearts;
        }
    }
    exports.LifeComponent = LifeComponent;
});
define("components/scoreComponent", ["require", "exports", "components/component", "eventTrigger"], function (require, exports, component_17, eventTrigger_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ScoreComponent extends component_17.Component {
        constructor() {
            super(...arguments);
            this.scoreChangedEvent = new eventTrigger_4.EventTrigger();
        }
        // ## Méthode *setup*
        // Cette méthode conserve le composant de texte qui affiche
        // le pointage, et initialise sa valeur.
        setup(descr) {
            this.scoreSprite = component_17.Component.findComponent(descr.scoreSprite);
            this.value = 0;
        }
        // ## Propriété *value*
        // Cette méthode met à jour le pointage et l'affichage de
        // ce dernier.
        get value() {
            return this._value;
        }
        set value(newVal) {
            this._value = newVal;
            this.scoreChangedEvent.trigger(this.value);
            this.scoreSprite.text = this.value.toString();
        }
    }
    exports.ScoreComponent = ScoreComponent;
});
define("components/rupeeComponent", ["require", "exports", "components/component"], function (require, exports, component_18) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class RupeeComponent extends component_18.Component {
        // ## Propriété *value*
        // Cette propriété retourne la valeur numérique correspondant
        // au rubis.
        get value() {
            return this.values[this.type];
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
            this.values = descr.values;
            this.lifetime = descr.lifetime;
        }
        // ## Méthode *setup*
        // Cette méthode choisit une valeur aléatoire pour le rubis, et
        // détermine la sprite correspondante.
        setup() {
            const types = Object.keys(this.values);
            const count = types.length;
            this.type = types[Math.floor(Math.random() * count)];
            const sprite = this.owner.getComponent('Sprite');
            sprite.spriteName = this.type;
            this.start = (new Date()).getTime();
        }
        // ## Méthode *update*
        // La méthode *update* de chaque composant est appelée une fois
        // par itération de la boucle de jeu.
        update(timing) {
            const elapsed = timing.now.getTime() - this.start;
            if (elapsed > this.lifetime) {
                this.owner.active = false;
                this.owner.parent.removeChild(this.owner);
            }
        }
    }
    exports.RupeeComponent = RupeeComponent;
});
define("components/playerComponent", ["require", "exports", "components/component", "eventTrigger", "gl-matrix"], function (require, exports, component_19, eventTrigger_5, gl_matrix_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Facing;
    (function (Facing) {
        Facing["Back"] = "B";
        Facing["Front"] = "F";
        Facing["Left"] = "L";
        Facing["Right"] = "R";
    })(Facing || (Facing = {}));
    class PlayerComponent extends component_19.Component {
        constructor() {
            super(...arguments);
            this.deadEvent = new eventTrigger_5.EventTrigger();
            this.isDead = false;
            this.facing = Facing.Front;
            this.isAttacking = false;
            this.isMoving = false;
            this.isHurt = false;
            this.isInvulnerable = false;
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create(descr) {
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
        setup(descr) {
            this.input = component_19.Component.findComponent(descr.input);
            this.spriteSheet = component_19.Component.findComponent(descr.spriteSheet);
            this.score = component_19.Component.findComponent(descr.score);
            this.life = component_19.Component.findComponent(descr.life);
            this.life.deadEvent.add(this, this.onDead);
            this.life.hurtEvent.add(this, this.onHurt);
            descr.onHurtEnable.forEach((item) => {
                const component = component_19.Component.findComponent(item);
                this.life.hurtEvent.add(this, () => {
                    component.enabled = true;
                });
            });
            return this.owner.addComponent('Sprite', {
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
        onDead() {
            this.isDead = true;
            this.deadEvent.trigger();
        }
        // ## Méthode *onHurt*
        // Déclenchée lorsque le joueur est blessé
        onHurt() {
            const collider = this.owner.getComponent('Collider');
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
        update(timing) {
            let delta = undefined;
            if (this.isDead) {
                delta = this.updateDead();
            }
            else if (this.isHurt) {
                delta = this.updateHurt();
            }
            else {
                delta = this.updateStandard();
            }
            const visible = (!this.isInvulnerable) || (timing.frame % 2 != 0);
            this.sprite.enabled = visible;
            const position = this.owner.getComponent('Position');
            gl_matrix_5.vec3.scale(delta, delta, 3);
            position.translate(delta);
            position.clamp(this.gameArea.x, this.gameArea.x + this.gameArea.w, this.gameArea.y, this.gameArea.y + this.gameArea.h);
        }
        // ## Méthode *updateDead*
        // Met à jour le joueur quand il est mort
        updateDead() {
            this.isMoving = false;
            this.isAttacking = false;
            this.sprite.isAnimated = false;
            this.sprite.spriteName = `${this.prefix}D`;
            this.sprite.updateMesh();
            const collider = this.owner.getComponent('Collider');
            collider.enabled = false;
            return gl_matrix_5.vec3.create();
        }
        // ## Méthode *updateHurt*
        // Met à jour le joueur quand il est blessé
        updateHurt() {
            this.isMoving = false;
            this.isAttacking = false;
            this.sprite.isAnimated = false;
            this.sprite.spriteName = `${this.prefix}H${this.facing}`;
            this.sprite.updateMesh();
            const delta = gl_matrix_5.vec3.create();
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
        updateStandard() {
            if (!this.isAttacking && this.input.getKey('attack')) {
                this.isAttacking = true;
                this.sprite.animationFrame = 1;
                this.sprite.frameSkip = 1;
            }
            const delta = gl_matrix_5.vec3.create();
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
            this.isMoving = gl_matrix_5.vec3.length(delta) > 0;
            this.updateSprite();
            this.sprite.updateMesh();
            return delta;
        }
        // ## Méthode *updateSprite*
        // Choisi la sprite appropriée selon le contexte.
        updateSprite() {
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
        onCollision(otherCollider) {
            const obj = otherCollider.owner;
            const rupee = obj.getComponent('Rupee');
            const heart = obj.getComponent('Heart');
            const chicken = obj.getComponent('Chicken');
            if (rupee) {
                this.score.value += rupee.value;
                obj.active = false;
                obj.parent.removeChild(obj);
            }
            if (heart) {
                this.life.value += heart.heal;
                obj.active = false;
                obj.parent.removeChild(obj);
            }
            if (chicken) {
                if (this.isAttacking) {
                    chicken.onAttack();
                }
                else {
                    this.life.value -= chicken.attack;
                }
            }
        }
    }
    exports.PlayerComponent = PlayerComponent;
});
define("components/rawSpriteComponent", ["require", "exports", "components/textureComponent", "graphicsAPI"], function (require, exports, textureComponent_3, GraphicsAPI) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let GL;
    class RawSpriteComponent extends textureComponent_3.TextureComponent {
        // ## Méthode *create*
        create(descr) {
            GL = GraphicsAPI.context;
            // On charge l'image et les shaders
            return super.create(descr)
                .then(() => {
                // On crée ici un tableau de 4 vertices permettant de représenter
                // le rectangle à afficher.
                this.vertexBuffer = GL.createBuffer();
                GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
                this.vertices = new Float32Array(4 * textureComponent_3.TextureComponent.vertexSize);
                GL.bufferData(GL.ARRAY_BUFFER, this.vertices, GL.DYNAMIC_DRAW);
                // On crée ici un tableau de 6 indices, soit 2 triangles, pour
                // représenter quels vertices participent à chaque triangle:
                // ```
                // 0    1
                // +----+
                // |\   |
                // | \  |
                // |  \ |
                // |   \|
                // +----+
                // 3    2
                // ```
                this.indexBuffer = GL.createBuffer();
                GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
                const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);
                GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, indices, GL.DYNAMIC_DRAW);
                // Et on initialise le contenu des vertices
                this.updateComponents(descr);
            });
        }
        // ## Méthode *display*
        // La méthode *display* choisit le shader et la texture appropriée
        // via la méthode *bind* sélectionne le tableau de vertices et
        // d'indices et fait l'appel de rendu.
        display() {
            GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            this.bind();
            GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);
            this.unbind();
        }
        // ## Méthode *updateComponents*
        // Cette méthode met à jour le contenu de chaque vertex.
        updateComponents(descr) {
            let ref;
            const position = this.owner.getComponent('Position').worldPosition;
            let width = (ref = descr.width) !== undefined ? ref : this.image.width;
            let height = (ref = descr.height) !== undefined ? ref : this.image.height;
            if (descr.scale) {
                width *= descr.scale;
                height *= descr.scale;
            }
            const z = position[2];
            const xMin = position[0] - width / 2;
            const xMax = xMin + width;
            const yMax = position[1] - height / 2;
            const yMin = yMax - height;
            const v = [
                xMin, yMin, z, 0, 0,
                xMax, yMin, z, 1, 0,
                xMax, yMax, z, 1, 1,
                xMin, yMax, z, 0, 1,
            ];
            this.vertices.set(v);
            GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
            GL.bufferSubData(GL.ARRAY_BUFFER, 0, this.vertices);
        }
    }
    exports.RawSpriteComponent = RawSpriteComponent;
});
define("components/refereeComponent", ["require", "exports", "components/component", "eventTrigger"], function (require, exports, component_20, eventTrigger_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class RefereeComponent extends component_20.Component {
        constructor() {
            super(...arguments);
            this.winEvent = new eventTrigger_6.EventTrigger();
            this.players = [];
        }
        // ## Méthode *create*
        // Cette méthode est appelée pour configurer le composant avant
        // que tous les composants d'un objet aient été créés.
        create() {
            this.winEvent.add(this, this.showWinMessage);
        }
        // ## Méthode *setup*
        // Cette méthode configure le composant.
        setup(descr) {
            descr.players.forEach((p) => {
                const player = component_20.Component.findComponent(p);
                this.players.push(player);
                player.deadEvent.add(this, this.onDead, undefined, player);
            });
        }
        // ## Méthode *onDead*
        // Cette méthode est déclenchée quand un joueur meurt
        onDead( /*player*/) {
            let bestScore = -1;
            let bestPlayer = null;
            let worstScore = Number.MAX_VALUE;
            let worstPlayer = null;
            let gameOver = true;
            this.players.forEach((p) => {
                if (!gameOver) {
                    return;
                }
                if (!p.isDead) {
                    gameOver = false;
                    return;
                }
                if (p.score.value > bestScore) {
                    bestScore = p.score.value;
                    bestPlayer = p;
                }
                if (p.score.value < worstScore) {
                    worstScore = p.score.value;
                    worstPlayer = p;
                }
            });
            if (gameOver) {
                this.winEvent.trigger(bestPlayer, worstPlayer);
            }
        }
        // ## Méthode *showWinMessage*
        // Affiche un popup mentionnant le gagnant
        showWinMessage(winner, loser) {
            alert(`${winner.name} a gagné contre ${loser.name}`);
        }
    }
    exports.RefereeComponent = RefereeComponent;
});
define("components/timerComponent", ["require", "exports", "components/component"], function (require, exports, component_21) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // ## Méthode *format*
    // Cette méthode prend un interval et le converti en une chaîne
    // lisible.
    function format(total_ms) {
        const total_s = Math.floor(total_ms / 1000);
        const minutes = Math.floor(total_s / 60);
        const seconds = total_s - (minutes * 60);
        let secText = seconds.toString();
        if (seconds < 10) {
            secText = '0' + secText;
        }
        return `${minutes}:${secText}`;
    }
    // # Classe *TimerComponent*
    // Ce composant affiche le temps écoulé depuis son lancement.
    class TimerComponent extends component_21.Component {
        // ## Méthode *setup*
        // Cette méthode conserve le composant de texte qui affiche
        // le pointage, et initialise sa valeur.
        setup() {
            this.textSprite = this.owner.getComponent('TextSprite');
            this.start = (new Date()).getTime();
        }
        // ## Méthode *onEnabled*
        // La méthode *onEnabled* est appelée quand l'objet passe de l'état
        // activé à désactivé.
        onEnabled() {
            const now = (new Date()).getTime();
            const paused = now - this.beginPause;
            this.start += paused;
        }
        // ## Méthode *onDisabled*
        // La méthode *onDisabled* est appelée quand l'objet passe de l'état
        // désactivé à activé.
        onDisabled() {
            this.beginPause = (new Date()).getTime();
        }
        // ## Méthode *update*
        // La méthode *update* de chaque composant est appelée une fois
        // par itération de la boucle de jeu.
        update(timing) {
            const elapsed = timing.now.getTime() - this.start;
            const array = format(elapsed).split('');
            for (let i = 0; i < array.length; ++i) {
                if (array[i] === ':') {
                    array[i] = 'colon';
                }
            }
            this.textSprite.array = array;
        }
    }
    exports.TimerComponent = TimerComponent;
});
define("components/deformationCompositorComponent", ["require", "exports", "components/compositorComponent", "graphicsAPI"], function (require, exports, compositorComponent_1, GraphicsAPI) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let GL;
    class DeformationCompositorComponent extends compositorComponent_1.CompositorComponent {
        // ## Méthode *onEnabled*
        // La méthode *onEnabled* est appelée quand l'objet passe de l'état
        // activé à désactivé.
        onEnabled() {
            this.start = +new Date();
        }
        // ## Méthode *setup*
        // Charge les shaders et les textures nécessaires au composant
        setup(descr) {
            GL = GraphicsAPI.context;
            const width = GraphicsAPI.canvas.width;
            const height = GraphicsAPI.canvas.height;
            this.speed = descr.speed;
            this.scale = descr.scale;
            this.start = +new Date();
            return super.setup(descr)
                .then(() => {
                return GraphicsAPI.loadImage(descr.source);
            })
                .then((image) => {
                this.deformation = GL.createTexture();
                GL.bindTexture(GL.TEXTURE_2D, this.deformation);
                GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.REPEAT);
                GL.bindTexture(GL.TEXTURE_2D, null);
                return GraphicsAPI.loadImage(descr.intensity);
            })
                .then((image) => {
                this.intensity = GL.createTexture();
                GL.bindTexture(GL.TEXTURE_2D, this.intensity);
                GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
                GL.bindTexture(GL.TEXTURE_2D, null);
                this.positionAttrib = GL.getAttribLocation(this.shader, 'aPosition');
                this.uSampler = GL.getUniformLocation(this.shader, 'uSampler');
                this.uDeformation = GL.getUniformLocation(this.shader, 'uDeformation');
                this.uIntensity = GL.getUniformLocation(this.shader, 'uIntensity');
                this.uTime = GL.getUniformLocation(this.shader, 'uTime');
                this.uScale = GL.getUniformLocation(this.shader, 'uScale');
                const verts = [1, 1, -1, 1, -1, -1, -1, -1, 1, -1, 1, 1];
                this.screenQuad = GL.createBuffer();
                GL.bindBuffer(GL.ARRAY_BUFFER, this.screenQuad);
                GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(verts), GL.STATIC_DRAW);
                this.itemSize = 2;
                this.numItems = 6;
                this.rttFrameBuffer = GL.createFramebuffer();
                GL.bindFramebuffer(GL.FRAMEBUFFER, this.rttFrameBuffer);
                this.renderTexture = GL.createTexture();
                GL.bindTexture(GL.TEXTURE_2D, this.renderTexture);
                GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, width, height, 0, GL.RGBA, GL.UNSIGNED_BYTE, null);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
                GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
                this.renderBuffer = GL.createRenderbuffer();
                GL.bindRenderbuffer(GL.RENDERBUFFER, this.renderBuffer);
                GL.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, width, height);
                GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, this.renderTexture, 0);
                GL.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, this.renderBuffer);
                GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
                GL.bindTexture(GL.TEXTURE_2D, null);
                GL.bindRenderbuffer(GL.RENDERBUFFER, null);
                GL.bindFramebuffer(GL.FRAMEBUFFER, null);
            });
        }
        // ## Méthode *compose*
        // Cette méthode est appelée afin d'appliquer un effet sur la caméra
        compose(texture) {
            GL.bindFramebuffer(GL.FRAMEBUFFER, this.rttFrameBuffer);
            GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
            GL.useProgram(this.shader);
            GL.bindBuffer(GL.ARRAY_BUFFER, this.screenQuad);
            GL.enableVertexAttribArray(this.positionAttrib);
            GL.vertexAttribPointer(this.positionAttrib, this.itemSize, GL.FLOAT, false, 0, 0);
            GL.activeTexture(GL.TEXTURE0);
            GL.bindTexture(GL.TEXTURE_2D, texture);
            GL.uniform1i(this.uSampler, 0);
            GL.activeTexture(GL.TEXTURE1);
            GL.bindTexture(GL.TEXTURE_2D, this.deformation);
            GL.uniform1i(this.uDeformation, 1);
            GL.activeTexture(GL.TEXTURE2);
            GL.bindTexture(GL.TEXTURE_2D, this.intensity);
            GL.uniform1i(this.uIntensity, 2);
            const elapsed = ((+new Date()) - this.start) / 1000 * this.speed;
            GL.uniform1f(this.uTime, elapsed);
            GL.uniform1f(this.uScale, this.scale);
            GL.drawArrays(GL.TRIANGLES, 0, this.numItems);
            GL.disableVertexAttribArray(this.positionAttrib);
            if (elapsed >= 1) {
                this.enabled = false;
            }
            return this.renderTexture;
        }
    }
    exports.DeformationCompositorComponent = DeformationCompositorComponent;
});
define("components/renderCompositorComponent", ["require", "exports", "components/compositorComponent", "graphicsAPI"], function (require, exports, compositorComponent_2, GraphicsAPI) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let GL;
    // # Classe *RenderCompositorComponent*
    // Ce compositeur affiche la texture à l'écran. Il devrait être le dernier
    // de la liste.
    class RenderCompositorComponent extends compositorComponent_2.CompositorComponent {
        // ## Méthode *setup*
        // Charge les shaders et configure le composant
        setup(descr) {
            GL = GraphicsAPI.context;
            return super.setup(descr)
                .then(() => {
                this.positionAttrib = GL.getAttribLocation(this.shader, 'aPosition');
                this.uSampler = GL.getUniformLocation(this.shader, 'uSampler');
                const verts = [1, 1, -1, 1, -1, -1, -1, -1, 1, -1, 1, 1];
                this.screenQuad = GL.createBuffer();
                GL.bindBuffer(GL.ARRAY_BUFFER, this.screenQuad);
                GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(verts), GL.STATIC_DRAW);
                this.itemSize = 2;
                this.numItems = 6;
            });
        }
        // ## Méthode *compose*
        // Cette méthode est appelée afin d'effectuer le rendu final.
        compose(texture) {
            GL.bindFramebuffer(GL.FRAMEBUFFER, null);
            GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
            GL.useProgram(this.shader);
            GL.bindBuffer(GL.ARRAY_BUFFER, this.screenQuad);
            GL.enableVertexAttribArray(this.positionAttrib);
            GL.vertexAttribPointer(this.positionAttrib, this.itemSize, GL.FLOAT, false, 0, 0);
            GL.activeTexture(GL.TEXTURE0);
            GL.bindTexture(GL.TEXTURE_2D, texture);
            GL.uniform1i(this.uSampler, 0);
            GL.drawArrays(GL.TRIANGLES, 0, this.numItems);
            GL.disableVertexAttribArray(this.positionAttrib);
            // On ne s'en sert plus après ça
            return texture;
        }
    }
    exports.RenderCompositorComponent = RenderCompositorComponent;
});
define("components/debugDrawCallsComponent", ["require", "exports", "components/component", "graphicsAPI"], function (require, exports, component_22, GraphicsAPI) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let GL;
    let origDrawElements;
    let value = 0;
    // ## Méthode *countDrawCalls*
    // Cette méthode est appelée à la place de *drawElements*
    // de l'API WebGL. Puisqu'on utilise une manière détournée
    // d'atteindre cette méthode, le pointeur *this*
    // correspond au contexte WebGL. On incrémente donc le
    // compteur d'appels de rendu, et on appelle ensuite
    // la méthode d'origine.
    function countDrawCalls(mode, count, type, offset) {
        value++;
        origDrawElements.apply(GL, [mode, count, type, offset]);
    }
    class DebugDrawCallsComponent extends component_22.Component {
        // ## Méthode *create*
        // On substitue ici la méthode *drawElements* de l'API
        // WebGL par une fonction locale.
        create() {
            GL = GraphicsAPI.context;
            origDrawElements = GL.drawElements;
            GL.drawElements = countDrawCalls;
        }
        // ## Méthode *setup*
        // On conserve la référence vers l'élément HTML dans
        // lequel on écrira le nombre d'appels de rendu.
        setup(descr) {
            this.target = document.getElementById(descr.field);
        }
        // ## Méthode *update*
        // On affiche le nombre d'appels de rendu exécuté à
        // la dernière itération et on remet le compteur à zéro.
        update() {
            this.target.innerHTML = value.toString();
            value = 0;
        }
    }
    exports.DebugDrawCallsComponent = DebugDrawCallsComponent;
});
define("components", ["require", "exports", "components/backgroundLoaderComponent", "components/cameraComponent", "components/chickenComponent", "components/chickenSpawnerComponent", "components/colliderComponent", "components/countdownComponent", "components/enablerComponent", "components/heartComponent", "components/inputComponent", "components/layerComponent", "components/lifeComponent", "components/playerComponent", "components/positionComponent", "components/rawSpriteComponent", "components/refereeComponent", "components/rupeeComponent", "components/scoreComponent", "components/spriteComponent", "components/spriteSheetComponent", "components/textSpriteComponent", "components/timerComponent", "components/deformationCompositorComponent", "components/renderCompositorComponent", "components/debugDrawCallsComponent"], function (require, exports, backgroundLoaderComponent_1, cameraComponent_2, chickenComponent_1, chickenSpawnerComponent_1, colliderComponent_1, countdownComponent_1, enablerComponent_1, heartComponent_1, inputComponent_1, layerComponent_1, lifeComponent_1, playerComponent_1, positionComponent_1, rawSpriteComponent_1, refereeComponent_1, rupeeComponent_1, scoreComponent_1, spriteComponent_2, spriteSheetComponent_1, textSpriteComponent_1, timerComponent_1, deformationCompositorComponent_1, renderCompositorComponent_1, debugDrawCallsComponent_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ComponentFactory {
        // ## Fonction statique *create*
        // Cette fonction instancie un nouveau composant choisi dans
        // le tableau `componentCreators` depuis son nom.
        static create(type, owner) {
            if (!ComponentFactory.componentCreators[type])
                console.error(type);
            const comp = new ComponentFactory.componentCreators[type](owner);
            comp.__type = type;
            return comp;
        }
    }
    // ## Attribut statique *componentCreators*
    // Ce tableau associatif fait le lien entre les noms des composants
    // tels qu'utilisés dans le fichier JSON et les classes de
    // composants correspondants.
    ComponentFactory.componentCreators = {
        BackgroundLoader: backgroundLoaderComponent_1.BackgroundLoaderComponent,
        Camera: cameraComponent_2.CameraComponent,
        Chicken: chickenComponent_1.ChickenComponent,
        ChickenSpawner: chickenSpawnerComponent_1.ChickenSpawnerComponent,
        Collider: colliderComponent_1.ColliderComponent,
        Countdown: countdownComponent_1.CountdownComponent,
        Enabler: enablerComponent_1.EnablerComponent,
        Heart: heartComponent_1.HeartComponent,
        Input: inputComponent_1.InputComponent,
        Layer: layerComponent_1.LayerComponent,
        Life: lifeComponent_1.LifeComponent,
        Player: playerComponent_1.PlayerComponent,
        Position: positionComponent_1.PositionComponent,
        RawSprite: rawSpriteComponent_1.RawSpriteComponent,
        Referee: refereeComponent_1.RefereeComponent,
        Rupee: rupeeComponent_1.RupeeComponent,
        Score: scoreComponent_1.ScoreComponent,
        Sprite: spriteComponent_2.SpriteComponent,
        SpriteSheet: spriteSheetComponent_1.SpriteSheetComponent,
        TextSprite: textSpriteComponent_1.TextSpriteComponent,
        Timer: timerComponent_1.TimerComponent,
        DeformationCompositor: deformationCompositorComponent_1.DeformationCompositorComponent,
        RenderCompositor: renderCompositorComponent_1.RenderCompositorComponent,
        DebugDrawCalls: debugDrawCallsComponent_1.DebugDrawCallsComponent,
    };
    exports.ComponentFactory = ComponentFactory;
});
define("entity", ["require", "exports", "components", "scene"], function (require, exports, components_1, scene_9) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // # Classe *Entity*
    // La classe *Entity* représente un objet de la scène qui
    // peut contenir des enfants et des composants.
    class Entity {
        constructor() {
            // ## Membre *active*
            // Si ce membre a une valeur fausse, les systèmes devraient
            // ignorer les composants de cet objet et ses enfants.
            this.active = true;
            this.components = new Map();
            this.nextChildOrder = 0;
            this.children = new Set();
            this.childrenByName = new Map();
            this.childrenByChild = new Map();
            this.parent = null;
        }
        // ## Méthode *addComponent*
        // Cette méthode prend en paramètre le type d'un composant et
        // instancie un nouveau composant.
        addComponent(type, descr) {
            const newComponent = Entity.componentCreator(type, this);
            this.components.set(type, newComponent);
            return Promise.resolve()
                .then(() => newComponent.create(descr))
                .then(() => {
                scene_9.Scene.current.onComponentCreated(newComponent, descr);
                return newComponent;
            });
        }
        // ## Fonction *getComponent*
        // Cette fonction retourne un composant existant du type spécifié
        // associé à l'objet.
        getComponent(type) {
            return this.components.get(type);
        }
        // ## Méthode *addChild*
        // La méthode *addChild* ajoute à l'objet courant un objet
        // enfant.
        addChild(objectName, child) {
            if (child.parent)
                throw new Error("Cet objet est déjà attaché à un parent");
            const childEntry = {
                name: objectName,
                order: this.nextChildOrder++,
                child: child,
            };
            this.children.add(childEntry);
            this.childrenByName.set(objectName, childEntry);
            this.childrenByChild.set(child, childEntry);
            child.parent = this;
        }
        // ## Méthode *removeChild*
        // La méthode *removeChild* enlève un enfant de l'objet courant
        removeChild(child) {
            if (child.parent !== this)
                throw new Error("Cet object n'est pas attaché à ce parent");
            const childEntry = this.childrenByChild.get(child);
            this.childrenByChild.delete(child);
            if (this.childrenByName.get(childEntry.name) === childEntry)
                this.childrenByName.delete(childEntry.name);
            this.children.delete(childEntry);
            child.parent = null;
        }
        // ## Fonction *getChild*
        // La fonction *getChild* retourne un objet existant portant le
        // nom spécifié, dont l'objet courant est le parent.
        getChild(objectName) {
            const childEntry = this.childrenByName.get(objectName);
            if (childEntry)
                return childEntry.child;
        }
        // ## Méthode *walkChildren*
        // Cette méthode parcourt l'ensemble des enfants de cette
        // entité et appelle la fonction `fn` pour chacun, afin
        // d'implémenter le patron de conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception)).
        walkChildren(fn) {
            const sortedChildren = Array.from(this.children).sort((a, b) => a.order - b.order);
            sortedChildren.forEach((v) => fn(v.child, v.name));
        }
        // ## Méthode *walkComponent*
        // Cette méthode parcourt l'ensemble des composants de cette
        // entité et appelle la fonction `fn` pour chacun, afin
        // d'implémenter le patron de conception [visiteur](https://fr.wikipedia.org/wiki/Visiteur_(patron_de_conception)).
        walkComponent(fn) {
            this.components.forEach(fn);
        }
    }
    // ## Fonction *componentCreator*
    // Référence vers la fonction permettant de créer de
    // nouveaux composants. Permet ainsi de substituer
    // cette fonction afin de réaliser des tests unitaires.
    Entity.componentCreator = components_1.ComponentFactory.create;
    exports.Entity = Entity;
});
define("scene", ["require", "exports", "entity"], function (require, exports, entity_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // # Classe *Scene*
    // La classe *Scene* représente la hiérarchie d'objets contenus
    // simultanément dans la logique du jeu.
    class Scene {
        constructor() {
            this.root = new entity_1.Entity();
            this.compDescr = new Map();
        }
        // ## Fonction statique *create*
        // La fonction *create* permet de créer une nouvelle instance
        // de la classe *Scene*, contenant tous les objets instanciés
        // et configurés. Le paramètre `description` comprend la
        // description de la hiérarchie et ses paramètres. La fonction
        // retourne une promesse résolue lorsque l'ensemble de la
        // hiérarchie est configurée correctement.
        static create(description) {
            const scene = new Scene();
            Scene.current = scene;
            return scene.createChildren(description, scene.root)
                .then(() => {
                let root = scene.root;
                return scene;
            });
        }
        createChildren(description, parent) {
            let p = Promise.resolve();
            Object.keys(description).forEach((name) => {
                const descr = description[name];
                p = p.then(() => this.createChild(descr, name, parent));
            });
            return p;
        }
        createChild(descr, name, parent) {
            const newObj = new entity_1.Entity();
            parent.addChild(name, newObj);
            let p = Promise.resolve()
                .then(() => this.createChildren(descr.children || {}, newObj));
            Object.keys(descr.components || {}).forEach((type) => {
                const compDescr = descr.components[type];
                p = p.then(() => newObj.addComponent(type, compDescr));
            });
            return p.then(() => newObj);
        }
        onComponentCreated(comp, descr) {
            this.compDescr.set(comp, descr);
        }
        // ## Fonction *findObject*
        // La fonction *findObject* retourne l'objet de la scène
        // portant le nom spécifié.
        findObject(objectName) {
            return this.findObjectRecursive(this.root, objectName);
        }
        findObjectRecursive(parent, objectName) {
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
        walk(fn, onlyActive = true) {
            return this.walkRecursive(fn, this.root, '(root)', onlyActive);
        }
        walkRecursive(fn, entity, name, onlyActive) {
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
        refreshLoop() {
            if (this.compDescr.size > 0) {
                return this.setupMissing();
            }
            return null;
        }
        setupMissing() {
            const p = [];
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
    exports.Scene = Scene;
});
define("sceneMgrSystem", ["require", "exports", "scene", "utils"], function (require, exports, scene_10, Utils) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SceneMgrSystem {
        // Méthode *iterate*
        // Appelée à chaque tour de la boucle de jeu
        iterate(dT) {
            return Promise.resolve().then(() => scene_10.Scene.current.refresh());
        }
        loadScene(file) {
            return Utils.loadJSON(file)
                .then((sceneDescription) => {
                return scene_10.Scene.create(sceneDescription);
            });
        }
    }
    exports.SceneMgrSystem = SceneMgrSystem;
});
define("main", ["require", "exports", "utils", "sceneMgrSystem", "displaySystem", "logicSystem"], function (require, exports, Utils, sceneMgrSystem_1, displaySystem_1, logicSystem_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // ## Variable *systems*
    // Représente la liste des systèmes utilisés par notre moteur
    let systems;
    let sceneMgr;
    // ## Méthode *run*
    // Cette méthode initialise les différents systèmes nécessaires
    // et démarre l'exécution complète du jeu.
    function run(config) {
        exports.GlobalConfig = config;
        setupSystem(config);
        return launchGame(config);
    }
    exports.run = run;
    // ## Méthode *launchGame*
    // Cette méthode initialise la scène du jeu et lance la
    // boucle de jeu.
    function launchGame(config) {
        return sceneMgr.loadScene(config.launchScene)
            .then(() => {
            return Utils.loop([iterate]);
        });
    }
    // ## Méthode *iterate*
    // Réalise une itération sur chaque système.
    function iterate(dT) {
        let p = Promise.resolve();
        systems.forEach((s) => {
            p = p.then(() => s.iterate(dT));
        });
        return p;
    }
    // ## Méthode *setupSystem*
    // Cette méthode initialise les différents systèmes nécessaires.
    function setupSystem(config) {
        sceneMgr = new sceneMgrSystem_1.SceneMgrSystem();
        const display = new displaySystem_1.DisplaySystem(config.canvasId);
        const logic = new logicSystem_1.LogicSystem();
        systems = [sceneMgr, display, logic];
    }
});
define("chickendodge", ["require", "exports", "main"], function (require, exports, main_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function init() {
        return main_1.run({
            canvasId: 'canvas',
            launchScene: 'scenes/play.json'
        });
    }
    exports.init = init;
});
//# sourceMappingURL=merged.js.map