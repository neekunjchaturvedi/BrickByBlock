import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCubes,
  faPercent,
  faExchangeAlt,
} from "@fortawesome/free-solid-svg-icons";

export const FeaturesSection = () => {
  const features = [
    {
      icon: <FontAwesomeIcon icon={faCubes} size="lg" />,
      title: "Tokenize Any Asset",
      description:
        "Securely convert any high-value item—art, real estate, collectibles—into a unique, verifiable digital token (NFT) on the Avalanche blockchain.",
    },
    {
      icon: <FontAwesomeIcon icon={faPercent} size="lg" />,
      title: "Fractionalize Ownership",
      description:
        "Break down your asset's token into thousands of smaller, affordable shares. Unlock liquidity and open up investment to a global audience.",
    },
    {
      icon: <FontAwesomeIcon icon={faExchangeAlt} size="lg" />,
      title: "Trade with Confidence",
      description:
        "Buy and sell whole assets or fractional shares on our decentralized marketplace. All transactions are transparent, secure, and powered by smart contracts.",
    },
  ];

  return (
    <section id="features" className="bg-gray-900 py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-indigo-400 tracking-wider">
            How It Works
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl tracking-tight">
            A New Paradigm of Ownership
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400">
            We provide a seamless, three-step process to bring any asset into
            the digital economy.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-800 p-8 rounded-2xl border border-gray-700 transform hover:-translate-y-2 transition-transform duration-300 flex items-center justify-center flex-col"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-600 text-white mb-6 text-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2 text-center">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-center">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
