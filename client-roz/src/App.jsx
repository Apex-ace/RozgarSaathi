import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import FaceAuth from "./pages/FaceAuth";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/face-auth" element={<FaceAuth />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;