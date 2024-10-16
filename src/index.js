import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Reducer from './features/Reducer'
import App from './App'


const store = configureStore({
  reducer: Reducer,
});

(() => {
  kintone.events.on('app.record.index.show', (event) => {
    if(event.viewId != "6475473") return;
    const root = ReactDOM.createRoot(document.querySelector('.root'));
    root.render(
      <React.StrictMode>
        <Provider store={store}>
          <App/>
        </Provider>
      </React.StrictMode>
    );
  });
})()