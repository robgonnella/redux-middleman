import * as chai from 'chai'
import { Middleware, Store } from 'redux';
import { spy, SinonSpy } from 'sinon';
import * as Util from './util';
import { ReduxMiddleman } from '../src';
/* tslint:disable:no-var-requires */
const Logger = require('logplease');
/* tslint:enable:no-var-requires */
const log = Logger.create('[tests]', {showTimestamp: false});

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
  this.timeout(70000);

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
      const action0 = Util.action0;
      store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(1);
      const returnData = spy0.lastCall.args[0];
      chai.expect(returnData.action).to.deep.equal(action0);
      chai.expect(returnData.currentState).to.deep.equal(Util.initialState);
      chai.expect(typeof returnData.dispatch).to.equal('function');
    }
  );

  it(
    'does not register same callback to same action more than once',
    () => {
      middleman.on(Util.ACTION0, spy0);
      middleman.on(Util.ACTION0, spy0);
      const action0 = Util.createAction(Util.ACTION0, 'data-zero');
      store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(1);
    }
  );

  it(
    'calls registered callback multiple times',
    () => {
      middleman.on(Util.ACTION0, spy0);
      const action0 = Util.action0;
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
      const action0 = Util.action0;
      store.dispatch(action0);
      store.dispatch(action0);
      store.dispatch(action0);
      chai.expect(spy0.callCount).to.equal(1);
    }
  );

  it(
    'inserts a dispatch before registered action',
    () => {
      const action0 = Util.action0;
      const action1 = Util.action1;
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
      const action0 = Util.action0;
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
    const action0 = Util.action0;
    const action1 = Util.action1;
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
    const action0 = Util.action0;
    const action1 = Util.action1;
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

  it('awaits asynchrouns listeners and synchronizes actions', async () => {
    const action0 = Util.action0;
    const action1 = Util.action1;
    const action2 = Util.action2;
    let result: string[] = [];
    const unsub = store.subscribe(() => {
      result.push(store.getState().data);
    });

    middleman.await(Util.ACTION1, async (data) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });
      data.dispatch(action0);
    });

    store.dispatch(action1);
    store.dispatch(action2);
    await new Promise((resolve) => {
     const id = setInterval(() => {
        if(result.length === 3) {
          clearInterval(id);
          resolve();
        }
      }, 100);
    });
    chai.expect(result[0]).to.equal('data-zero');
    chai.expect(result[1]).to.equal('data-one');
    chai.expect(result[2]).to.equal('data-two');
    unsub();
  });

  it(
    'awaits asynchrouns listeners and synchronizes actions - stress',
    async () => {
      const action0 = Util.action0;
      const action1 = Util.action1;
      const action2 = Util.action2;
      const action3 = Util.action3;
      const action4 = Util.action4;
      const action5 = Util.action5;
      const action6 = Util.action6;
      let result: string[] = [];
      const unsub = store.subscribe(() => {
        result.push(store.getState().data);
      });

      middleman.await(Util.ACTION1, async (data) => {
        log.info('action 1 middleware');
        log.info('waiting 5 seconds before dispatching action 2');
        await new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });
        log.info('dispatching action 2 from inside action 1 middleware')
        data.dispatch(action2);
      });

      middleman.await(Util.ACTION2, async (data) => {
        log.info('action 2 middleware');
        log.info('waiting 1 second before dispatching action 3');
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
        log.info('dispatching action 3 from inside action 2 middleware')
        data.dispatch(action3)
      });

      middleman.on(Util.ACTION3, async (data) => {
        log.info('action 3 middleware');
        log.info('dispatching action 4 from inside action 3 middleware')
        data.dispatch(action4);
      });

      middleman.on(Util.ACTION4, async (data) => {
        log.info('action 4 middleware');
        log.info('dispatching action 5 from inside action 4 middleware')
        data.dispatch(action5)
      });

      middleman.await(Util.ACTION5, async (data) => {
        log.info('action 5 middleware');
        log.info('waiting 5 second before dispatching action 6');
        await new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });
        log.info('dispatching action 6 from inside action 5 middleware')
        data.dispatch(action6)
      });

      middleman.on(Util.ACTION6, (data) => {
        log.info('action 6 middleware');
        log.info('dipatching action 0 from inside action 6 middleware');
        data.dispatch(action0);
      })

      log.info('dispatching action 1');
      store.dispatch(action1);
      log.info('dispatching action 2')
      store.dispatch(action2);
      log.info('dispatching action 3')
      store.dispatch(action3);
      log.info('dispatching action 4')
      store.dispatch(action4);
      log.info('dispatching action 5')
      store.dispatch(action5);
      log.info('dispatching action 6')
      store.dispatch(action6);
      log.info('dispatching action 0')
      store.dispatch(action0);
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject('Timeout')
        }, 65000)
        const intervalId = setInterval(() => {
          if(result.length >= 28) {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            resolve();
          }
        }, 200);
      });
      log.info(result);
      chai.expect(result[0]).to.equal('data-zero');
      chai.expect(result[1]).to.equal('data-six');
      chai.expect(result[2]).to.equal('data-five');
      chai.expect(result[3]).to.equal('data-four');
      chai.expect(result[4]).to.equal('data-three');
      chai.expect(result[5]).to.equal('data-two');
      chai.expect(result[6]).to.equal('data-one');

      chai.expect(result[7]).to.equal('data-zero');
      chai.expect(result[8]).to.equal('data-six');
      chai.expect(result[9]).to.equal('data-five');
      chai.expect(result[10]).to.equal('data-four');
      chai.expect(result[11]).to.equal('data-three');
      chai.expect(result[12]).to.equal('data-two');

      chai.expect(result[13]).to.equal('data-zero');
      chai.expect(result[14]).to.equal('data-six');
      chai.expect(result[15]).to.equal('data-five');
      chai.expect(result[16]).to.equal('data-four');
      chai.expect(result[17]).to.equal('data-three');

      chai.expect(result[18]).to.equal('data-zero');
      chai.expect(result[19]).to.equal('data-six');
      chai.expect(result[20]).to.equal('data-five');
      chai.expect(result[21]).to.equal('data-four');

      chai.expect(result[22]).to.equal('data-zero');
      chai.expect(result[23]).to.equal('data-six');
      chai.expect(result[24]).to.equal('data-five');

      chai.expect(result[25]).to.equal('data-zero');
      chai.expect(result[26]).to.equal('data-six');

      chai.expect(result[27]).to.equal('data-zero');

      chai.expect(result.length).to.equal(28);
      unsub();
    }
  );

});
