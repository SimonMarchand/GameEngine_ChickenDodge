import { IConfig } from "./main";

interface IMethod {
  (...args: any[]): void;
}

interface IHandler {
  instance: Object;
  method: IMethod | string;
  context?: any;
}

// # Classe *EventTrigger*
// Classe utilitaire pour appeler des méthodes en réaction
// à des événements.
export class EventTrigger {
  private handlers = new Map<string, IHandler>();
  private autoIndex = 0;

  // ## Méthode *add*
  // Ajoute une méthode à appeler lors du déclenchement de
  // l'événement.
  add(instance: Object, method: IMethod | string, name?: string, context?: any) {
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
  remove(name: string) {
    this.handlers.delete(name);
  }

  // ## Méthode *trigger*
  // Déclenche les méthodes enregistrées.
  trigger(...params: any[]) {
    this.handlers.forEach((handler) => {
      if (handler.context)
        params.push(handler.context);
      let method = handler.method;
      if (typeof (method) === 'string')
        method = (handler.instance as any)[method] as IMethod;
      method.apply(handler.instance, params);
    });
  }
}
