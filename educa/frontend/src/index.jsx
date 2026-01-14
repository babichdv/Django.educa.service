// index.jsx
import React, { StrictMode, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { CookiesProvider } from 'react-cookie';

// Страницы
import TreeWatcher from './TreeWatcher/TreeWatcher.jsx';
import MainPage from './mainPage/mainPage.jsx';
import TableEditor from './TreeWatcher/TableEditor.jsx';

const AppContent = ({ currentState, setCurrentState }) => {
  switch (currentState) {
    case 'TreeWatcher':
      return <TreeWatcher setCurrentState={setCurrentState} />;
    case 'ItemGroup':
      return (
        <TreeWatcher
          setCurrentState={setCurrentState}
          body={<TableEditor tableType="ItemGroup" />}
        />
      );
    case 'ItemUnit':
      return (
        <TreeWatcher
          setCurrentState={setCurrentState}
          body={<TableEditor tableType="ItemUnit" />}
        />
      );
    case 'MeasureUnit':
      return (
        <TreeWatcher
          setCurrentState={setCurrentState}
          body={<TableEditor tableType="MeasureUnit" />}
        />
      );
    default:
    return <MainPage setCurrentState={setCurrentState} />;
  }
};

const App = () => {
  const [currentState, setCurrentState] = useState('main');

  return (
    <CookiesProvider defaultSetOptions={{ path: '/' }}>
      <AppContent currentState={currentState} setCurrentState={setCurrentState} />
    </CookiesProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);