import { EventEmitter } from 'events';
import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';
/* tslint:disable:no-var-requires */
const Logger = require('logplease');
/* tslint:enable:no-var-requires */

const log = Logger.create('redux-middleman', {showTimestamp: false});

export function isAction(a: any): a is AnyAction {
  return a !== undefined && a.type !== undefined;
}

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

  private q: AnyAction[] = [];
  private scheduledDispatches: AnyAction[] = [];
  private paused: number = 0;
  private registeredActions: IRegisteredActionStore<S> = {};
  private registeredAsyncActions: IRegisteredActionStore<S> = {};

  constructor() {
    super();
    this.setUpInternalListeners();
    this.middleware = this.createMiddleware();
  }

  public await = (evt: string, listener: ICallback<S>): void => {
    if (!this.registeredAsyncActions[evt]) {
      this.registeredAsyncActions[evt] = [];
    }
    this.registeredAsyncActions[evt].push(listener);
  }

  // public unawait = (evt: string, listener: ICallback<S>): void => {
  //   if (this.registeredAsyncActions[evt]) {
  //     this.registeredAsyncActions[evt] = (
  //       this.registeredAsyncActions[evt].filter((l) => {
  //         return l !== listener;
  //       })
  //     );
  //   }
  // }

  // public unawaitAll = (evt?: string): void => {
  //   if (evt) {
  //     if (this.registeredAsyncActions[evt]) {
  //       delete this.registeredAsyncActions[evt];
  //     }
  //   } else {
  //     this.registeredAsyncActions = {};
  //   }
  // }

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

  private readonly getAllListenerKeys = (): string[] => {
    const asyncKeys = Object.keys(this.registeredActions);
    const syncKeys = Object.keys(this.registeredAsyncActions);
    const both = syncKeys.concat(asyncKeys);
    return Array.from(new Set(both));
  }

  private callAyncListeners = async (
    evt: string,
    data: ICallbackData<S>
  ): Promise<void> => {

    if (
      !this.registeredAsyncActions[evt] ||
      !this.registeredAsyncActions[evt].length
    ) { return; }

    const callbacks = this.registeredAsyncActions[evt];
    this.paused += callbacks.length;
    for (const cb of callbacks) {
      await cb(data);
    }
    this.paused -= callbacks.length;
  }

  private scheduleNextDispatch = (action: AnyAction) => {
    this.scheduledDispatches.push(action);
  }

  private callNextScheduledDispatch = (dispatch: Dispatch<AnyAction>) => {
    const nextAction = this.scheduledDispatches.shift();
    if (nextAction) {
      log.debug('finally dispatching postponed action:', nextAction.type);
      dispatch(nextAction);
    }
  }

  private enqueue = (action: AnyAction) => {
    if (action.inMiddleware) {

      const callByIndex: number = this.q.indexOf(action.calledBy);
      if (callByIndex < 0) {
        log.debug('moving middlware action to front of Q', action.type);
        this.q.unshift(action);
      } else {
        log.debug(`splicing ${action.type} into Q at index`, callByIndex);
        this.q.splice(callByIndex, 0, action);
      }

    } else {
      log.debug('-----pushing action to back of q --->', action.type);
      this.q.push(action);
    }
  }

  private dequeue = (fallback: AnyAction): AnyAction => {
    const queuedAction = this.q.shift();
    if (isAction(queuedAction)) {
      return queuedAction;
    } else {
      log.debug('no queued action return given action --->', fallback.type);
      return fallback;
    }
  }

  private dispatch = async (
    calledByAction: AnyAction,
    async: boolean,
    dispatch: Dispatch<AnyAction>,
    action: AnyAction
  ): Promise<void> => {

    const newAction: AnyAction = {...action};
    newAction.calledBy = calledByAction;
    newAction.inMiddleware = true;
    newAction.async = async;

    if (async) {
      ++this.paused;
      await dispatch(newAction);
      --this.paused;
    } else {
      dispatch(newAction);
    }
  }

  private flushQ = (next: Dispatch<AnyAction>): void => {
    while (this.q.length) {
      const a = this.q.shift();
      if (isAction(a)) {
        log.debug('flushing action -->', a.type);
        next(a);
      }
    }
  }

  private qHasPendingMiddlewareActions = (): boolean => {
    return this.q.length >= 1;
  }

  /**
   *  Creates middlware to be provided to the redux applyMiddleware method.
   *  @todo: Consider adding extraArg functionality similar to thunk
   */
  private createMiddleware = (): Middleware => {

    return (
      ({getState, dispatch}: MiddlewareAPI) => (next: Dispatch<AnyAction>) =>
      async (action: AnyAction) => {
        log.debug('----START OF ACTION LOOP-----');

        if (
          action.inMiddleware === undefined &&
          this.qHasPendingMiddlewareActions()
        ) {
          log.debug('postponing action --->', action);
          this.scheduleNextDispatch(action);
          return;
        }

        log.debug('queuing action --->', action.type);
        let currentAction: AnyAction = action;
        this.enqueue(action);

        log.debug('----pause count --->', this.paused);

        const keys = this.getAllListenerKeys();
        let shouldFlush = true;

        if (!keys.includes(currentAction.type)) {
          if (!this.paused) {
            currentAction = this.dequeue(currentAction);
            log.debug('----dequeued action --->', currentAction.type);
            log.debug('----calling next action --->', currentAction.type);
            return next(currentAction);
          } else {
            log.debug('pausing action until next round', currentAction.type);
            shouldFlush = false;
          }
        }

        const currentState: S = getState();

        const asyncCallbackData: ICallbackData<S> = {
          action: currentAction,
          currentState,
          dispatch: this.dispatch.bind(this, currentAction, true, dispatch)
        };

        const syncCallbackData: ICallbackData<S> = {
          action: currentAction,
          currentState,
          dispatch: this.dispatch.bind(this, currentAction, false, dispatch)
        };

        if (this.registeredAsyncActions[currentAction.type]) {
          log.debug('---waiting for asyc middlewares to finish----');
          await this.callAyncListeners(currentAction.type, asyncCallbackData);
          log.debug('---asyc middlewares finished----', currentAction.type);
        }

        if (this.registeredActions[currentAction.type]) {
          this.emit(currentAction.type, syncCallbackData);
        }

        if (!this.paused) {
          currentAction = this.dequeue(action);
          log.debug('----dequeued action --->', currentAction.type);
          log.debug('----registered next action --->', currentAction.type);
          next(currentAction);
        } else {
          log.debug('pausing action until next round', currentAction.type);
          shouldFlush = false;
        }

        if (shouldFlush) {
          log.debug('-----flushing q --->');
          this.flushQ(next);
          this.callNextScheduledDispatch(dispatch);
        }

        log.debug('-------END OF ACTION LOOP------');
        return;
      }
    );
  }
}


