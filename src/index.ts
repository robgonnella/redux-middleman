import { EventEmitter } from 'events';
import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';

/**
 * Represents callback registered by user for a specified action
 */
export type ICallback<S> = (
  action: AnyAction,
  currState: S,
  nextState: S
) => any;

/**
 * Represents internal store of callbacks by action type
 */
export interface ICallbackInterface<S> {
  [key: string]: Array<ICallback<S>>;
}

/**
 * Represents object parameter passed to emitter callback, where
 * action.type is then used to find and call the appropriate user callback(s).
 */
export interface EventCallbackObj<S> {
  action: AnyAction;
  currState: S;
  nextState: S;
}

/**
 * ReduxMiddleman class:
 * Intention is to sit inbetween dispatch and reducer and allow
 * users to register callbacks for specified actions. The callbacks
 * are passed the original action, the current state, and the next
 * state that resulted from the action.
 */
export class ReduxMiddleman<S> {

  public readonly middleware: Middleware;
  private readonly emitter: EventEmitter;
  private callbacks: ICallbackInterface<S>;

  constructor() {
    this.callbacks = {};
    this.emitter = new EventEmitter();
    this.middleware = this.createMiddleware();
  }

  public on = (
    type: string | string[],
    callback: ICallback<S> | Array<ICallback<S>>
  ): void => {

    if (Array.isArray(type)) {
      return this.onMult(type, callback);
    }

    if (!this.callbacks[type]) {
      this.callbacks[type] = [];
    }

    if (Array.isArray(callback)) {
      this.callbacks[type] = this.callbacks[type].concat(callback);
    } else {
      this.callbacks[type].push(callback);
    }

    this.listen(type);
  }

  public once = (
    type: string,
    callback: ICallback<S> | Array<ICallback<S>>
  ): void => {

    if (!this.callbacks[type]) {
      this.callbacks[type] = [];
    }

    if (Array.isArray(callback)) {
      this.callbacks[type] = this.callbacks[type].concat(callback);
    } else {
      this.callbacks[type].push(callback);
    }

    this.listen(type, true);
  }

  public off = (type: string | string[]): void => {
    if (Array.isArray(type)) {
      return this.offMult(type);
    }
    delete this.callbacks[type];
    this.emitter.removeListener(type, this.emitterCallback);
  }

  public removeAll = (): void => {
    this.callbacks = {};
    this.emitter.removeAllListeners();
  }

  private createMiddleware = (): Middleware => {

    return (store: MiddlewareAPI) => (next: Dispatch<AnyAction>) =>
      (action: AnyAction) => {
        if (!this.callbacks[action.type]) { return next(action); }
        const currState = store.getState();
        const nextAction = next(action);
        const nextState = store.getState();
        this.emitter.emit(action.type, {action, currState, nextState});
        return nextAction;
      };
  }

  private onMult = (
    types: string[],
    callback: ICallback<S> | Array<ICallback<S>>
  ): void => {
    for (const type of types) {
      this.on(type, callback);
    }
  }

  private offMult = (types: string[]): void => {
    for (const type of types) {
      this.off(type);
    }
  }

  private emitterCallback = (
    once: boolean,
    data: EventCallbackObj<S>
  ): void  => {
    const type = data.action.type;
    this.callbacks[type].forEach((callback: ICallback<S>) => {
      callback(data.action, data.currState, data.nextState);
      if (once) { delete this.callbacks[type]; }
    });
  }

  private listen = (type: string, once?: boolean): void => {
    once = once ? true : false;
    const listen = once ? 'once' : 'on';
    this.emitter[listen](type, this.emitterCallback.bind(this, once));
  }
}


