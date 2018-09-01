import { createStore, AnyAction, Middleware, applyMiddleware } from 'redux';

export const ACTION0 = 'ACTION0';
export const ACTION1 = 'ACTION1';
export const ACTION2 = 'ACTION2';
export const ACTION3 = 'ACTION3';
export const ACTION4 = 'ACTION4';
export const ACTION5 = 'ACTION5';
export const ACTION6 = 'ACTION6';

export const action0 = {
  type: ACTION0,
  data: 'data-zero'
}

export const action1 = {
  type: ACTION1,
  data: 'data-one'
}

export const action2 = {
  type: ACTION2,
  data: 'data-two'
}

export const action3 = {
  type: ACTION3,
  data: 'data-three'
}

export const action4 = {
  type: ACTION4,
  data: 'data-four'
}

export const action5 = {
  type: ACTION5,
  data: 'data-five'
}

export const action6 = {
  type: ACTION6,
  data: 'data-six'
}

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

export const initialState: State = {
  data: 'this is some data'
};

function reducer(state: State = initialState, action: AnyAction) {
  return action.data ? { data: action.data } : state;
}

export function setUpStore(middleware: Middleware) {
  return createStore(reducer, applyMiddleware(middleware));
}
