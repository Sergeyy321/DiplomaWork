import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
function squareDigits(num) {
  let result = ''
  for (let i = 0; i <= num.toString().length; i++) {
    result = result + (Number(num.toString()[i]) * Number(num.toString()[i])).toString()

  }
  return console.log(Number(result))
}