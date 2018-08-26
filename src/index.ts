import { EventEmitter } from 'events';
import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';

/**
 *  Represents data provided to callback for registered actions
 */
export interface ICallbackData<S> {
  action: AnyAction;
  currentState: S;
  dispatch: Dispatch;
}

/**
 *  Represents callback registered by user for a specified action
 */
export type ICallback<S> = (data: ICallbackData<S>) => void;

/**
 *  Represents internal store of registered actions. Used to improve
 *  performance by only calling getState and only emitting
 *  when necessary.
 */
export interface IRegisteredActionStore<S> {
  [type: string]: Array<ICallback<S>>;
}

/**
 *  ReduxMiddleman:
 *  Middleware that allows users to register callbacks for specified
 *  actions. The callbacks are passed the original action, the current
 *  state, and the redux dispatch method. Any dispatches that occur
 *  within the middleware will precede the intercepted action.
 *
 *  Current design extends the EventEmitter library allowing users to
 *  register and deregister small pieces of middleware on the fly.
 */
export class ReduxMiddleman<S> extends EventEmitter {

  public readonly middleware: Middleware;
  private registeredActions: IRegisteredActionStore<S>;

  constructor() {
    super();
    this.registeredActions = {};
    this.setUpInternalListeners();
    this.middleware = this.createMiddleware();
  }

  /**
   *  Adds a set of internal listeners to track when users add and remove
   *  listeners. Tracking listeners added by users allows us to only emit
   *  when necessay and prevents us from making needless calls to getState
   *  on every action.
   */
  private setUpInternalListeners = () => {
    // register removeLister first so we don't add it to our
    // list of tracked actions
    this.on('removeListener', (evt: string, listener: ICallback<S>) => {
      if (this.registeredActions[evt] && this.registeredActions[evt].length) {
        this.registeredActions[evt] = this.registeredActions[evt].filter(
          (l) => l !== listener
        );
      }
    });

    this.on('newListener', (evt: string, listener: ICallback<S>) => {
      if (!this.registeredActions[evt]) {
        this.registeredActions[evt] = [listener];
      } else if (this.registeredActions[evt].includes(listener)) {
        // remove identicle listener for this event
        this.removeListener(evt, listener);
        // above call causes all occurances of that listener to be removed
        // from our list for that action. Here we just add it back so we
        // have just the one occurance
        this.registeredActions[evt].push(listener);
      } else {
        this.registeredActions[evt].push(listener);
      }
    });

  }

  /**
   *  Creates middlware to be provided to the redux applyMiddleware method.
   *  @todo: Consider adding extraArg functionality similar to thunk
   */
  private createMiddleware = (): Middleware => {

    return (
      ({getState, dispatch}: MiddlewareAPI) => (next: Dispatch<AnyAction>) =>
      (action: AnyAction) => {
        if (
          !this.registeredActions[action.type] ||
          !this.registeredActions[action.type].length
        ) {
          return next(action);
        }
        const currentState: S = getState();
        const callbackData: ICallbackData<S> = {action, currentState, dispatch};
        this.emit(action.type, callbackData);
        return next(action);
      }
    );
  }
}


