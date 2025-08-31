import { Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./pages/home/home";

import { AuthProvider } from "./contexts/auth";
import Navbar from "./components/home/navbar";
import MarketPlace from "./pages/marketplace/home";
import AddAsset from "./pages/ListAssets/Addasset";

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<MarketPlace />} />
        <Route path="/addasset" element={<AddAsset />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
