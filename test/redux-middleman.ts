import * as chai from 'chai'
import { Middleware, Store } from 'redux';
import { spy, SinonSpy } from 'sinon';
import * as Util from './util';
import { ReduxMiddleman } from '../src';

const spy0: SinonSpy = spy();
const spy1: SinonSpy = spy();

function resetSpyHistory() {
  spy0.resetHistory();
  spy1.resetHistory();
}

let middleman: ReduxMiddleman<Util.State>;
let store: Store;

function createMiddleware(): Middleware {
  middleman = new ReduxMiddleman<Util.State>();
  return middleman.middleware;
}


describe('Redux Middleman', function() {

  beforeEach(function() {
    resetSpyHistory();
    if (middleman) { middleman.removeAll(); }
    const middleware: Middleware = createMiddleware();
    store = Util.setUpStore(middleware);
  });

  it(
    'calls registered callback with action, currState, and nextState',
    async () => {
      middleman.on(Util.ACTION0, spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      await store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(1);
      chai.expect(spy0.lastCall.args[0]).to.deep.equal(action0);
      chai.expect(spy0.lastCall.args[1]).to.deep.equal(Util.initialState);
      chai.expect(spy0.lastCall.args[2]).to.deep.equal({ data: 'data-zero' });
    }
  );

  it(
    'calls registered callback multiple times',
    async () => {
      middleman.on(Util.ACTION0, spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      await store.dispatch(action0);
      await store.dispatch(action0);
      await store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(3);
    }
  );

  it(
    'registers an array of actions to a single callback',
    async () => {
      middleman.on([Util.ACTION0, Util.ACTION1], spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      const action1 = Util.createAction(Util.ACTION1, 'data-one');
      await store.dispatch(action0);
      await store.dispatch(action0);
      await store.dispatch(action1);
      await store.dispatch(action1);
      chai.expect(spy0.callCount).to.equal(4);
      chai.expect(spy0.firstCall.args[0]).to.deep.equal(action0);
      chai.expect(spy0.lastCall.args[0]).to.deep.equal(action1);
    }
  );

  it(
    'registers an array of actions to an array of callbacks',
    async () => {
      middleman.on([Util.ACTION0, Util.ACTION1], [spy0, spy1]);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      const action1 = Util.createAction(Util.ACTION1, 'data-one');
      await store.dispatch(action0);
      await store.dispatch(action0);
      await store.dispatch(action1);
      await store.dispatch(action1);

      chai.expect(spy0.callCount).to.equal(4);
      chai.expect(spy0.firstCall.args[0]).to.deep.equal(action0);
      chai.expect(spy0.lastCall.args[0]).to.deep.equal(action1);

      chai.expect(spy1.callCount).to.equal(4);
      chai.expect(spy1.firstCall.args[0]).to.deep.equal(action0);
      chai.expect(spy1.lastCall.args[0]).to.deep.equal(action1);
    }
  );

  it(
    'registers callback only once',
    async () => {
      middleman.once(Util.ACTION0, spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-one');
      await store.dispatch(action0);
      await store.dispatch(action0);
      await store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(1);
    }
  );

  it(
    'registers an array of callbacks for an action only once',
    async () => {
      middleman.once(Util.ACTION0, [spy0, spy1]);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      await store.dispatch(action0);
      await store.dispatch(action0);
      await store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(1);
      chai.expect(spy1.callCount).to.equal(1);
    }
  );

  it(
    'deregisters action listener using \'off\'',
    async () => {
      middleman.on(Util.ACTION0, spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      await store.dispatch(action0);
      await store.dispatch(action0);
      await store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(3);
      middleman.off(Util.ACTION0);
      await store.dispatch(action0);
      await store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(3);
    }
  )

  it(
    'deregisters an array of action listeners using \'off\'',
    async () => {
      middleman.on([Util.ACTION0, Util.ACTION1], spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      const action1 = Util.createAction(Util.ACTION1, 'data-one');
      await store.dispatch(action0);
      await store.dispatch(action1);
      chai.expect(spy0.callCount).to.equal(2);
      middleman.off([Util.ACTION0, Util.ACTION1]);
      await store.dispatch(action0);
      await store.dispatch(action1);
      chai.expect(spy0.callCount).to.equal(2);
    }
  )

  it('removes all listeners', async function () {
    middleman.on(Util.ACTION0, spy0);
    middleman.on(Util.ACTION1, spy1);
    const action0 = Util.createAction(Util.ACTION0, 'data-zero');
    const action1 = Util.createAction(Util.ACTION1, 'data-one');
    await store.dispatch(action0);
    await store.dispatch(action1);
    chai.expect(spy0.callCount).to.equal(1);
    chai.expect(spy1.callCount).to.equal(1);
    middleman.removeAll();
    await store.dispatch(action0);
    await store.dispatch(action1);
    chai.expect(spy0.callCount).to.equal(1);
    chai.expect(spy1.callCount).to.equal(1);
  });

});
