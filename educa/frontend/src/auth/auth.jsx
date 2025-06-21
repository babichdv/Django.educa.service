import React, {useState, useEffect} from 'react'
import { useCookies } from 'react-cookie';
import { store, set, mainUpdate } from '../index.jsx';

export default function auth(stateClass) {
    const [ cookie_username, setCookie_username ] = useCookies(['username']);
    const [ cookie_token   , setCookie_token    ] = useCookies(['token']);

    useEffect( () => { 
        const classNames = require('./auth.css');
    }, []);

    async function fetcher(url, body){
        const response = await fetch(url, {
            method: 'POST',  
            headers: { 'Content-Type': 'application/json' },  
            body: JSON.stringify(body)
        });
        return response; 
    }
    async function registration(formData){
        const username = formData.get("username");
        const password = formData.get("password");
        const email    = formData.get("email");
        let url= window.location+'api_auth/users/'

        let response = await fetcher(url,
            {
                "user": {
                    "username": username,
                    "email": email,
                    "password": password
                }
            }
        )
        let result
        if(!response.ok) {
            console.log(response.statusText); return
        }else{
            result = await response.json()
        }
        setCookie_username("username", result.user.username, { path: '/' });
        setCookie_token   ("token"   , result.user.token   , { path: '/' });
        store.dispatch(set("chats")); 
        store.dispatch(mainUpdate())
    }
    async function login(formData) {
        const username = formData.get("username");
        const password = formData.get("password");
        let url= window.location+'api_auth/users/login/'

        let response = await fetcher(url,
            {
                "user": {
                    "username": username,
                    "password": password
                }
            }
        )
        let result
        if(!response.ok) {
            alert(response.statusText); return
        }else{
            result = await response.json()
        }
        setCookie_username("username", result.user.username, { path: '/' });
        setCookie_token   ("token"   , result.user.token   , { path: '/' });
        
        store.dispatch(set("chats")); 
        store.dispatch(mainUpdate())
    }
    
    
    return (
        <>
    <div className="container">
        <div className="form-container">
            <h2>Регистрация</h2>
            <form id="registration-form" action={registration}>
                <input type="text" placeholder="Username" name="username" required/>
                <input type="password" placeholder="Пароль" name="password" required/>
                <input type="email" placeholder="Email" name="email" required/>
                <button type="submit">Зарегистрироваться</button>
            </form>
        </div>
        
        <div className="form-container">
            <h2>Вход</h2>
            <form id="login-form" action={login}>
                <input type="text" placeholder="Username" name="username" required/>
                <input type="password" placeholder="Пароль" name="password" required/>
                <button type="submit">Войти</button>
            </form>
        </div>
    </div>
</>
)
}