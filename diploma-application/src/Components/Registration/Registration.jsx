  
import { useState } from "react";
import { registerUser } from "../../FireBase/firebase";
function Registration  () {


const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = () => {
    registerUser(email, password);
  };

  return (
    <div>
      <h1>Firebase Authentication </h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleRegister}>Register</button>
    </div>
);}
  export  default Registration 