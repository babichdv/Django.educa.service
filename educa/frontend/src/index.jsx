import React, { StrictMode } from 'react';

// модули
import ReactDOM from 'react-dom/client';
import { CookiesProvider } from 'react-cookie';
// страницы
import Api_react from './api_or_react_chat/App.jsx'
import Auth      from './auth/auth.jsx'
import Chats     from './chats/chats.jsx'
import MainPage  from './mainPage/mainPage.jsx'

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
const root = ReactDOM.createRoot(document.getElementById("root"));

const stateChoser = function() {
  switch (state.value) {
    case 'auth' : return <Auth stateClass={state}/> ; break;
    case 'mqtt' : return <Api_react/>               ; break;
    case 'chats': return <Chats/>                   ; break;
    default:      return <MainPage stateClass={state}/>; break;
  }
}
export const mainUpdate = function() {
  root.render(
    <CookiesProvider defaultSetOptions={{ path: '/' }}>
        <StrictMode>
          {stateChoser()}
        </StrictMode>
    </CookiesProvider> 
  )
}
mainUpdate();

function removeStyleTags(){
  const styleTags = document.querySelectorAll('style');
  styleTags.forEach(tag => {
    tag.parentNode.removeChild(tag);
  });
}