import { useState, useEffect } from "react";
import type { FC } from "react";
import { useAuth } from "../../contexts/auth";
import { useNavigate } from "react-router-dom";
import { BrowserProvider } from "ethers";

// --- SVG Icon Components ---
export const Logo: FC = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" rx="8" fill="url(#logo-gradient)" />
    <path d="M12 12H20V20H12V12Z" fill="white" />
    <path d="M20 12H28V20H20V12Z" fill="white" fillOpacity="0.6" />
    <path d="M12 20H20V28H12V20Z" fill="white" fillOpacity="0.6" />
    <path d="M20 20H28V28H20V20Z" fill="white" />
    <defs>
      <linearGradient
        id="logo-gradient"
        x1="0"
        y1="0"
        x2="40"
        y2="40"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
  </svg>
);

const MenuIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16m-7 6h7"
    />
  </svg>
);

const CloseIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const Navbar: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_PORT;

  // Check for existing login
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const wallet = localStorage.getItem("walletAddress");
    if (token && wallet) {
      setAccount(wallet);
    }
  }, []);

  const connectWallet = async () => {
    try {
      if (!(window as any).ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      setLoading(true);

      const provider = new BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      // 1. Request message from backend
      const msgRes = await fetch(`${apiBaseUrl}/auth/request-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      const { message } = await msgRes.json();

      // 2. Sign the message with MetaMask
      const signature = await signer.signMessage(message);

      // 3. Verify signature with backend
      const verifyRes = await fetch(`${apiBaseUrl}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, signature }),
      });

      if (!verifyRes.ok) throw new Error("Verification failed");

      const { token } = await verifyRes.json();

      // 4. Store auth token + wallet
      localStorage.setItem("authToken", token);
      localStorage.setItem("walletAddress", walletAddress);

      setAccount(walletAddress);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      alert("Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("walletAddress");
  };

  const formatAddress = (addr: string) =>
    `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  const navLinks = ["Marketplace", "AddAsset"];

  const WalletButton: FC = () => {
    if (account) {
      return (
        <div className="flex items-center gap-3">
          <span className="bg-gray-800 text-white font-mono text-sm px-4 py-2 rounded-lg border border-gray-700">
            {formatAddress(account)}
          </span>
          <button
            onClick={disconnectWallet}
            className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Disconnect
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={connectWallet}
        disabled={loading}
        className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-500"
      >
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black bg-opacity-30 backdrop-blur-lg border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="flex-shrink-0 flex items-center gap-2">
              <Logo />
              <span className="text-white font-bold text-xl">BrickByBlock</span>
            </div>
          </div>
          <div className="hidden md:flex gap-7">
            <div className="ml-10 flex items-end justify-end space-x-4">
              {navLinks.map((link) => (
                <a
                  key={link}
                  href={`/${link.toLowerCase()}`}
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
            <WalletButton />
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden border-t border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`/${link.toLowerCase()}`}
                className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
          <div className="px-4 pb-4">
            <WalletButton />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
