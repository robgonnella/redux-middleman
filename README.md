# Redux Middleman

This module works as redux middleware allowing you to listen for actions and
call registered callbacks. Callbacks are passed the original action, the
current state, and the redux dispatch method. This is meant to be
less opionated than redux-analytics-manager, which forces you to set a final
send method, and does not provide you the ability to dispatch other actions from
within the middleware. 

This module allows you insert dispatches prior to the intercepted action.
It also allows you to register and deregister your listeners on the fly, in
a sense adding and removing smaller pieces of middleware at any time.

All methods available on a node [EventEmitter]
are also available on a ReduxMiddleman instance.

### Installation

`npm install --save redux-middleman`

### Usage

- Register actions to callbacks. Callbacks are passed the original action,
  the current state, the redux dispatch method.
- Middleware is available as a property on the instance. Simply pass it to the
  redux `applyMiddleware` method.
- You can add and remove listeners at any time even after store creation

```javascript
// EXAMPLE USAGE
import { ReduxMiddleman } from 'redux-middleman';
const middleman = new ReduxMiddleman();

// Register callback
middleman.on(
  'PRODUCT-CLICK',
  ({action, currentState, dispatch}) => {
    const storeId = currentState.store.id;
    const productId = action.productId;
    analytics.send('product-click', {productId, storeId});
  }
);

// Register an action callback to be called only once
middleman.once(
  'PAGE-REFRESH',
  async ({action, currentState, dispatch}) => {
    // All of these dispatches will occur prior the 'PAGE-REFRESH' action
    dispatch(setLoadingSpinner(true));
    const storeId = currentState.store.id;
    const storeItems = await api.fetchItems(storeId);
    dispatch(populatStoreItems(storeItems));
    dispatch(setLoadingSpinner(false));
  }
);

// Remove specified listener
middleman.removeListener(PURCHASE-PRODUCT, callback);

// Remove all liseteners
middleman.removeAllListeners()

// Remove all listeners for specified action
middleman.removeAllListeners('PURCHASE-PRODUCT');

// Apply middleware to your store
const store = createStore(rootReducer, applyMiddleware(middleman.middleware));

``` 

### Methods
Use any method listed [here][EventEmitter] with ReduxMiddleman

e.g.
```
const middleman = new ReduxMiddleman();
middleman.on('event', callback);
middleman.once('event', callback);
middleman.removeListener('event', callback);
middleman.removeAllListeners();
```

[EventEmitter]: https://nodejs.org/api/events.html
