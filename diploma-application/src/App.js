
import './App.css';
import Header from './Components/Header/Header';
import Sidebar from './Components/Notes/Sidebar';

function App() {
  return (
    <div className="App">

   
     

      <Header />
      
      <Sidebar />
       <main className="ml-64 p-6">
        <h1>Контент</h1>
      </main>
    </div>
   
  );
}

export default App;