import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative h-screen flex items-center justify-center text-center bg-gray-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-50 z-10"></div>
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-transparent to-gray-900"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-600 rounded-full mix-blend-lighten filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600 rounded-full mix-blend-lighten filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-pink-600 rounded-full mix-blend-lighten filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-20 max-w-4xl mx-auto px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 leading-tight tracking-tight">
          Own Anything.{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
            Invest in Everything.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
          BrickByBlock transforms high-value assets into tradable digital
          shares. From Hyderabadi pearls to premium real estate, start your
          fractional ownership journey today.
        </p>
        <button
          className="bg-indigo-600 text-white font-bold text-lg px-8 py-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-indigo-600/500 cursor-pointer"
          onClick={() => {
            navigate("/marketplace");
          }}
        >
          Explore Marketplace
        </button>
      </div>
    </section>
  );
};
