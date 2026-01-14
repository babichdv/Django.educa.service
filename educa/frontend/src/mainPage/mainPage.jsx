// mainPage/mainPage.jsx
import React, { useEffect } from 'react';
import { useCookies } from 'react-cookie';

export default function MainPage({ setCurrentState }) {
  const [cookie_username] = useCookies(['username']);

  useEffect(() => {
    require('./mainPage.css');
  }, []);

  return (
    <>
      {cookie_username?.username ? (
        <div>Вы вошли как {cookie_username.username}</div>
      ) : null}
      <div className="square">
        <div
          className="button button4"
          onClick={() => setCurrentState('TreeWatcher')}
        >
          treeWatcher
        </div>
      </div>
    </>
  );
}