import React, {useState, useEffect} from 'react'
import { useCookies } from 'react-cookie';

import { mainUpdate } from '../index.jsx';
let userlistMassive = []
let messagesMassive = []
let chosenUser = '';
let chosenUserMessages = []

async function fetcher(url, token){
    const response = await fetch(url, {
        method: 'GET',  
        headers: { 'Content-Type' : 'application/json' ,
                   'Authorization': 'Token '+ token ,
        },
        // body: JSON.stringify(body)
    });
    return await response; 
}

function getUserList(token) {
    fetcher('api_auth/userlist', token).then( 
        async(list)=> {
            userlistMassive = await list.json();
            mainUpdate();
        } ,
        // (err)=> alert(err) 
    )
}
async function getMessages(token, username) {
    chosenUser = username;
    let response = fetcher('api_auth/messages', token);
    response.then( 
        async(list)=> {
            
            let listJson = await list.json()
            messagesMassive = listJson.messages;

            chosenUserMessages = []
            messagesMassive.forEach(messageObj => {
                if(messageObj.user_from == username || messageObj.user_to == username){
                    chosenUserMessages.push(messageObj)
                }
            });
            mainUpdate();
        } ,
        (err)=> alert(err) 
    )
}
function sendMessage(token, message){
    fetch('api_auth/messages', {
            method: 'POST',  
            headers: { 'Content-Type' : 'application/json' ,
                    'Authorization': 'Token '+ token ,
            },
            body: JSON.stringify({"user":{"username":chosenUser, "message":message}})
        }).then(
            (response)=>{},
            (err)=>{alert(err)}
        )
}


export default function chats() {
    
    useEffect( () => {
        const classNames = require('./chats.css');
        getUserList(cookie_token.token)
        setInterval(() => {
            getMessages(cookie_token.token,chosenUser)
        }, 3000);
    }, []);
    
	const [ input_value, setInput_value] = useState('text');
    const [ cookie_username, setCookie_username ] = useCookies(['username']);
    const [ cookie_token   , setCookie_token    ] = useCookies(['token']);
    
    function handleChange(event) {
        setInput_value(event.target.value); // текущий текст инпута
    }
    
    return (<>
        <div className="messenger-container">
            <div className="user-list">
                <h2>Пользователи</h2>
                <ul id="user-list">
                    {userlistMassive.map((item, index) =>
                        <li className="user" key={index} onClick={()=>{getMessages(cookie_token.token, item?.username)}}>{item?.username}</li>
                    )}
                </ul>
            </div>
            
            <div className="chat-window-cont">
                <div className="chat-window">
                    <h2 id="chat-title">{chosenUser?chosenUser:"Выберите пользователя для чата"}</h2>
                        {chosenUserMessages.map((item, index) =>
                            <div id="messages" key={index} className="messages">{item?.user_from +" : "+ item?.msg_text}</div>)
                        }
                </div>
                <input type="text" id="message-input" value={input_value} onChange={handleChange} placeholder="Введите сообщение..."/>
                <button onClick={()=>{sendMessage(cookie_token.token, input_value)}}>Отправить</button>
            </div>
        </div>
    </>)
}
