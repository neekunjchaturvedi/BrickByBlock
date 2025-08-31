import { Logo } from "./navbar";

export const Footer = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center space-x-6">
          {/* Add social links here if needed */}
        </div>
        <div className="mt-8 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-white font-bold text-xl">BrickByBlock</span>
          </div>
          <p className="mt-4 text-center text-base text-gray-400">
            &copy; 2025 BrickByBlock. All rights reserved. Democratizing asset
            ownership for everyone.
          </p>
        </div>
      </div>
    </footer>
  );
};
