import * as chai from 'chai'
import { Middleware, Store } from 'redux';
import { spy, SinonSpy } from 'sinon';
import * as Util from './util';
import { ReduxMiddleman } from '../src';

const spy0: SinonSpy = spy();
const spy1: SinonSpy = spy();
const spy2: SinonSpy = spy();

function resetSpyHistory() {
  spy0.resetHistory();
  spy1.resetHistory();
  spy2.resetHistory();
}

let middleman: ReduxMiddleman<Util.State>;
let store: Store;

function createMiddleware(): Middleware {
  middleman = new ReduxMiddleman<Util.State>();
  return middleman.middleware;
}


describe('Redux Middleman', function() {
  this.timeout(10000);

  beforeEach(function() {
    resetSpyHistory();
    if (middleman) { middleman.removeAllListeners(); }
    const middleware: Middleware = createMiddleware();
    store = Util.setUpStore(middleware);
  });

  it(
    'calls registered callback with action, currState, and dispatch',
    () => {
      middleman.on(Util.ACTION0, spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(1);
      const returnData = spy0.lastCall.args[0];
      chai.expect(returnData.action).to.deep.equal(action0);
      chai.expect(returnData.currentState).to.deep.equal(Util.initialState);
      chai.expect(typeof returnData.dispatch).to.equal('function');
    }
  );

  it(
    'calls registered callback multiple times',
    () => {
      middleman.on(Util.ACTION0, spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      store.dispatch(action0);
      store.dispatch(action0);
      store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(3);
    }
  );

  it(
    'registers callback only once',
    () => {
      middleman.once(Util.ACTION0, spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-one');
      store.dispatch(action0);
      store.dispatch(action0);
      store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(1);
    }
  );

  it(
    'inserts a dispatch before registered action',
    () => {
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      const action1 = Util.createAction(Util.ACTION1, 'data-one');
      middleman.on(Util.ACTION1, ({action, state, dispatch}) => {
        dispatch(action0);
        const data0 = store.getState().data;
        chai.expect(data0).to.equal('data-zero');
      });
      store.dispatch(action1);
      const data1 = store.getState().data;
      chai.expect(data1).to.equal('data-one');
    }
  );

  it(
    'deregisters action listener using \'removeListener\'',
    () => {
      middleman.on(Util.ACTION0, spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      store.dispatch(action0);
      store.dispatch(action0);
      store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(3);
      middleman.removeListener(Util.ACTION0, spy0);
      store.dispatch(action0);
      store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(3);
    }
  )

  it('removes all listeners', () => {
    middleman.on(Util.ACTION0, spy0);
    middleman.on(Util.ACTION1, spy1);
    const action0 = Util.createAction(Util.ACTION0, 'data-zero');
    const action1 = Util.createAction(Util.ACTION1, 'data-one');
    store.dispatch(action0);
    store.dispatch(action1);
    chai.expect(spy0.callCount).to.equal(1);
    chai.expect(spy1.callCount).to.equal(1);
    middleman.removeAllListeners();
    store.dispatch(action0);
    store.dispatch(action1);
    chai.expect(spy0.callCount).to.equal(1);
    chai.expect(spy1.callCount).to.equal(1);
  });

  it('removes all listeners for a specified action', async function () {
    middleman.on(Util.ACTION0, spy0);
    middleman.on(Util.ACTION0, spy1);
    middleman.on(Util.ACTION1, spy2);
    const action0 = Util.createAction(Util.ACTION0, 'data-zero');
    const action1 = Util.createAction(Util.ACTION1, 'data-one');
    store.dispatch(action0);
    store.dispatch(action1);
    chai.expect(spy0.callCount).to.equal(1);
    chai.expect(spy1.callCount).to.equal(1);
    chai.expect(spy2.callCount).to.equal(1);
    middleman.removeAllListeners(Util.ACTION0);
    store.dispatch(action0);
    store.dispatch(action1);
    chai.expect(spy0.callCount).to.equal(1);
    chai.expect(spy1.callCount).to.equal(1);
    chai.expect(spy2.callCount).to.equal(2);
  });

});
