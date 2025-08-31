import { Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./pages/home/home";

import { AuthProvider } from "./contexts/auth";
import Navbar from "./components/home/navbar";
import MarketPlace from "./pages/marketplace/home";
import AddAsset from "./pages/ListAssets/Addasset";
import AssetDetails from "./pages/marketplace/assetdetails";

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<MarketPlace />} />
        <Route path="/addasset" element={<AddAsset />} />
        <Route path="/assets/:id" element={<AssetDetails />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
