import React from 'react';
import './App.css';
import CalendarNote from './Components/CalendarNotes/CalendarNotes';
import Header from './Components/Header/Header';  

const App = () => {
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", flexDirection: "column" }}>

      <Header />
      

      <div style={{ flex: 1 }}>
        <CalendarNote />
      </div>
    </div>
  );
};

export default App;