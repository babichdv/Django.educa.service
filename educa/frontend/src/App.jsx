import { useState } from 'react'
import './App.css'

import {main} from './main'
import mqtt from 'mqtt'
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
const url = 'ws://broker.emqx.io:8083/mqtt'
const topic = 'django/mqtt'
const options = {
  // Clean session
  clean: true,
  // connectTimeout: 4000,
  clientId: 'reacter123',
  username: 'MQTT_USER',
  password: 'MQTT_PASSWORD',
}
const client  = mqtt.connect(url, options)
client.on('connect', function () {
  console.log('mqtt_Connected')
  // Subscribe to a topic
  client.subscribe(topic, function (err) {
    if (!err) {
      // Publish a message to a topic
      // client.publish(topic, 'Hello mqtt')
      console.log('Hello mqtt')
    }
  })
})
client.on('message', function (topic, message) {
  let msgObj = {};
  try {
    msgObj = JSON.parse(replaceAll(message.toString(),'\'','\"'))
  } catch (error) {
    console.log("Сообщение не объект");
  }
  // message is Buffer
  if(global_id2 == '' || msgObj?.id == global_id2)         /////////////// uuid >>>> id
    msgItems.push({text:msgObj?.text, user:msgObj?.id})    /////////////// uuid >>>> id
  main()
  console.log(message.toString())
  // client.end()
})

let msgItems = []
let global_id1 = '';
let global_id2 = '';
let global_texter = '';

function App() {
  const [id1, setid1] = useState('');
  const [id2, setid2] = useState('');
  const [texter, settexter] = useState('');
  const [count, setCount] = useState(0);
  global_id1 = id1;
  global_id2 = id2;
  global_texter = texter;

  return (
    <>
      <div className="container">
        <div className="input-section">
          <input type="text" value={id1} onChange={e => setid1(e.target.value)} placeholder="Введите свой id" className="input-field"/>
          <input type="text" value={id2} onChange={e => setid2(e.target.value)} placeholder="Введите id собеседника" className="input-field"/>
        </div>
        <div className="chat-window">
          {msgItems.map((item, index) =>
          <div className="message" key={index}>
              <span className="message-author">{item?.user}:</span>
              <span className="message-text">{item?.text}</span>
          </div>)}
        </div>
        <div className="send-section">
            <input type="text" value={texter} onChange={e => settexter(e.target.value)} placeholder="Введите ваше сообщение" className="send-input"/>
            <button className="send-button" onClick={()=>client.publish(topic, "{'id':'"+global_id1+"', 'text': '"+global_texter+"'}")}>Отправить</button>
        </div>
      </div>
    </>
  )
}

export default App
