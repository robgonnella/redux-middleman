# Redux Middleman

This module works as redux middleware allowing you to listen for actions and
call registered callbacks. Callbacks are passed the original action, the
current state, and the next state. This is meant to be slightly less opionated than
redux-analytics-manager which assumes you intend to have a final send method geared
towards anaytics. With this module you can choose to use your callbacks however you want. 

### Installation

`npm install --save redux-middleman`

### Usage

- Register actions to callbacks. Callbacks are passed the original action, 
  the current state, and the next state.
- Middleware is available as a property on the instance. Simply pass it to the
  redux `applyMiddleware` method.

If you register the same action more than once, the calls to your send method
will occur in the order they were defined. You can also use `registerActions`
to register an array of actions to the same analytics object, callback, or a
mixed array.

```javascript
// Example using Google Analytics

import { applyMiddleware, createStore } from 'redux';
import { ReduxMiddleman } from 'redux-middleman';

const middleman = new ReduxMiddleman();

// Register callback
middleman.on(
    'PURCHASE-PRODUCT',
    (action, currState, nextState) => {
        const product = action.product;
        const region = currState.regionID;
        myCustomApi.purchase(product, region)
    }
);

// Register an array of callbacks for a single action
middleman.on(
    'IMAGE-CLICK',
    [
        (action, currState, nextState) => {
            analytics.send('image-click', action.imageId);
        },
        async(action, currState, nextState) => {
            await myCustomApi.fetch(action.imageId);
        }
    ]
);

// Register an action callback to be called only once
middleman.once(
    'LOGIN-USER',
    (action, currState, nextState) => {
        const firstTime = (
            currState.loginCount = 0 && nextState.loginCount === 1;
        );
        if (firstTime) {
            analytics.send('first-time-login', action.username);
        }
    }
);

const store = createStore(rootReducer, applyMiddleware(middleman.middleware));

```

### Methods
- **constructor:**
    For typescript, pass your appState type during instantiation
- **on:**
    Register a single action, or an array of actions, to either a callback or an array
    of callbacks
- **off:**
    Removes action listener(s) and stops calling associated callbacks
- **once:**
    Listens for action and call callback only once
- **removeAll:**
    Removes all action listeners
