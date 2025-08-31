import { useLocation, useParams, Link } from "react-router-dom";
import { Button } from "antd";

const AssetDetails = () => {
  const { state } = useLocation();
  const { id } = useParams();
  const asset = state?.asset; // Passed from Marketplace

  if (!asset) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
        <p>
          Asset not found.{" "}
          <Link to="/marketplace" className="text-indigo-400 underline">
            Go back
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Section */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <img
            src={asset.image}
            alt={asset.name}
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Details Section */}
        <div>
          <h1 className="text-4xl font-extrabold mb-4">{asset.name}</h1>
          <p className="text-gray-400 text-lg mb-6">{asset.description}</p>

          <div className="space-y-4 mb-8">
            <div>
              <p className="text-xs text-gray-500">Owner</p>
              <p className="text-sm font-mono text-indigo-400">{asset.owner}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="text-2xl font-bold text-green-400">
                {asset.price} USD
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">IPFS Hash</p>
              <p className="text-sm font-mono text-gray-400">
                {asset.ipfsHash}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              type="primary"
              size="large"
              className="bg-indigo-600 hover:bg-indigo-500 rounded-xl"
            >
              Buy Now
            </Button>
            <Button
              size="large"
              className="bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-xl"
            >
              Make Offer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
