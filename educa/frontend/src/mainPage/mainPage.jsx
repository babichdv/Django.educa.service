import React, {useState, useEffect} from 'react'
import { useCookies } from 'react-cookie';
import { useSelector, useDispatch } from 'react-redux';
import { store, set, mainUpdate } from '../index.jsx';

export default function mainPage(stateClass) {
  const [ cookie_username, setCookie_username ] = useCookies(['username']);
  const [ cookie_token   , setCookie_token    ] = useCookies(['token']);

  const counter = useSelector((state) => state.value);
  const dispatch = useDispatch();
  
  useEffect( () => { 
    const classNames = require('./mainPage.css');
    
  }, []);


  async function getUserFromCookie(){
      const response = await fetch(window.location+'api_auth/userlist', {
          method: 'GET',
          headers: { 
            'Content-Type' : 'application/json' , 
            'Authorization': 'Token '+ cookie_token ,
          }
      });
      return response.json(); 
  }


  return (
    <>
        {cookie_username?.username?<div>Вы вошли как {cookie_username.username}</div>:<div></div>}
        <div className="square">
            <div className="button button1" onClick={() => { store.dispatch(set("mqtt")); store.dispatch(mainUpdate()) }} >Чат на   mqqt + react ,  mqtt + api_django + react</div>
            <div className="button button2" onClick={() => { store.dispatch(set("auth")); store.dispatch(mainUpdate()) }} >Авторизация</div>
            <div className="button button3" onClick={() => { store.dispatch(set("chats")); store.dispatch(mainUpdate()) }} >Чаты после авторизации</div>
            <div className="button button4" onClick={() => { store.dispatch(set("TreeWatcher")); store.dispatch(mainUpdate()) }} >treeWatcher</div>
        </div>
    </>
  )
}