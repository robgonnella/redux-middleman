import { createStore, AnyAction, Middleware, applyMiddleware } from 'redux';

export const ACTION0 = 'ACTION0';
export const ACTION1 = 'ACTION1';

export interface ITestAction {
  type: string;
  data: string;
}

export function createAction(type: string, data: string): ITestAction {
  return { type, data };
}

export interface State {
  data: string;
}

export const initialState = {
  data: 'this is some data'
};

function reducer(state: State = initialState, action: AnyAction) {
  return action.data ? { data: action.data } : state;
}

export function setUpStore(middleware: Middleware) {
  return createStore(reducer, applyMiddleware(middleware));
}
