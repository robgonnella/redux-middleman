import { EventEmitter } from 'events';
import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';

/**
 * Represents data provided to callback for registered actions
 */
export interface ICallbackData<S> {
  action: AnyAction;
  currentState: S;
  dispatch: Dispatch;
}

/**
 * Represents callback registered by user for a specified action
 */
export type ICallback<S> = (data: ICallbackData<S>) => void;

/**
 * Represents internal store of registered actions. Used to improve
 * performance by only performing necessary getState operations and emitting
 * for registered actions
 */
export interface IRegisteredActionStore {
  [type: string]: number;
}

/**
 * ReduxMiddleman:
 * Middleware that allows users to register callbacks for specified
 * actions. The callbacks are passed the original action, the current
 * state, and the redux dispatch method. Any dispatches that occur
 * within the middleware will precede the intercepted action.

 * Current design extends the EventEmitter library allowing users to
 * register and deregister small pieces of middleware on the fly.
 */
export class ReduxMiddleman<S> extends EventEmitter {

  public readonly middleware: Middleware;
  private registeredActions: IRegisteredActionStore;

  constructor() {
    super();
    this.registeredActions = {};
    this.setUpInternalListeners();
    this.middleware = this.createMiddleware();
  }

  private setUpInternalListeners = () => {

    // register removeLister first so we don't add it to our
    // list of tracked actions
    this.on('removeListener', (evt: string, listener: ICallback<S>) => {
      --this.registeredActions[evt];
      if (this.registeredActions[evt] <= 0) {
        delete this.registeredActions[evt];
      }
    });

    this.on('newListener', (evt: string, listener: ICallback<S>) => {
      if (!this.registeredActions[evt]) {
        this.registeredActions[evt] = 1;
      } else {
        ++this.registeredActions[evt];
      }
    });

  }

  private createMiddleware = (): Middleware => {

    return (
      ({getState, dispatch}: MiddlewareAPI) => (next: Dispatch<AnyAction>) =>
      (action: AnyAction) => {
        if (!this.registeredActions[action.type]) { return next(action); }
        const currentState: S = getState();
        const callbackData: ICallbackData<S> = {action, currentState, dispatch};
        this.emit(action.type, callbackData);
        return next(action);
      }
    );
  }
}


