import React, { StrictMode } from 'react';

// модули
  import ReactDOM from 'react-dom/client';
  import { CookiesProvider } from 'react-cookie';
  //redux
  import { Provider } from 'react-redux';
  import { configureStore, createSlice } from '@reduxjs/toolkit';
  import { createStore, applyMiddleware } from 'redux';
  import { thunk } from 'redux-thunk';  
// страницы
  import Api_react   from './api_or_react_chat/App.jsx';
  import Chats       from './chats/chats.jsx';
  import Auth        from './auth/auth.jsx';
  import TreeWatcher from './TreeWatcher/TreeWatcher.jsx';
  import MainPage    from './mainPage/mainPage.jsx';

const state = new class {
  constructor() {
    this._value = '';
  }
  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
  }
  setValue = function(value) {
    this._value = value;
    removeStyleTags();
    mainUpdate();
  }
}();

// Создаем slice (редьюсер + экшены)
const counterSlice = createSlice({
  name: 'state',
  initialState: { value: '' },
  reducers: {
    set: (state, value) => {
      removeStyleTags();
      state.value = value.payload;
    },
    mainUpdate: (state, value)=>{
      root.render(
        <Provider store={store}>
        <CookiesProvider defaultSetOptions={{ path: '/' }}>
        <StrictMode>
          {stateChoser(state.value)}
        </StrictMode>
        </CookiesProvider>
        </Provider>
      )
    }
  }
});

export const { set, mainUpdate } = counterSlice.actions;
export const store = createStore(counterSlice.reducer, applyMiddleware(thunk));


const root = ReactDOM.createRoot(document.getElementById("root"));

const stateChoser = function(state) {
  console.log(state);
  
  switch (state) {
    case 'auth'       : return <Auth stateClass={state}/> ; break;
    case 'mqtt'       : return <Api_react/>               ; break;
    case 'chats'      : return <Chats/>                   ; break;
    case 'TreeWatcher': return <TreeWatcher/>             ; break;
    default: return <MainPage stateClass={state}/>; break;
  }
}

function removeStyleTags(){
  const styleTags = document.querySelectorAll('style');
  styleTags.forEach(tag => {
    tag.parentNode.removeChild(tag);
  });
}

store.dispatch(mainUpdate())