import React from 'react';
import './App.css';
import CalendarNote from './Components/CalendarNotes/CalendarNotes';
import Header from './Components/Header/Header';  

const App = () => {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-body">
        <CalendarNote />
      </main>
    </div>
  );
};

export default App;
