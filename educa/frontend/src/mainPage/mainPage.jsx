import React, {useState, useEffect} from 'react'
import { useCookies } from 'react-cookie';


export default function mainPage(stateClass) {
  const [ cookie_username, setCookie_username ] = useCookies(['username']);
  const [ cookie_token   , setCookie_token    ] = useCookies(['token']);

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
        {cookie_token?<div>Вы вошли как {cookie_username.username}</div>:<div></div>}
        <div className="square">
            <div className="button button1" onClick={()=>stateClass.stateClass.setValue("mqtt" )} >Чат на   mqqt + react ,  mqtt + api_django + react</div>
            <div className="button button2" onClick={()=>stateClass.stateClass.setValue("auth" )} >Авторизация</div>
            <div className="button button3" onClick={()=>stateClass.stateClass.setValue("chats")} >Чаты после авторизации</div>
            <div className="button button4" onClick={()=>stateClass.stateClass.setValue(""     )} >-----</div>
        </div>
    </>
  )
}