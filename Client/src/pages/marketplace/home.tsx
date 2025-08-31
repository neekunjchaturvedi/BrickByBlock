import { useState, useEffect } from "react";
import { Input, Pagination, Alert, ConfigProvider, theme } from "antd";

const { Search } = Input;

// --- Sub-component for displaying a single asset ---
const AssetCard = ({ asset }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden group transform hover:-translate-y-2 transition-transform duration-300 ease-in-out">
    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
      <img
        src={asset.image}
        alt={asset.name}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      />
    </div>
    <div className="p-5">
      <h3 className="text-xl font-bold text-white truncate">{asset.name}</h3>
      <p className="text-gray-400 mt-2 h-12 overflow-hidden text-ellipsis">
        {asset.description}
      </p>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">Owner</p>
        <p className="text-sm font-mono text-indigo-400 truncate">
          {asset.owner}
        </p>
      </div>
    </div>
  </div>
);

// --- Loading Skeleton Component ---
const SkeletonCard = () => (
  <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden animate-pulse">
    <div className="bg-gray-700 aspect-w-1 aspect-h-1 w-full"></div>
    <div className="p-5">
      <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="h-3 bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-full"></div>
      </div>
    </div>
  </div>
);

// --- Main Marketplace Component ---
export default function Marketplace() {
  const [allAssets, setAllAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [assetsPerPage] = useState(8); // Show 8 assets per page

  const apiBaseUrl = import.meta.env.VITE_PORT;

  // Effect to fetch assets when the component mounts
  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBaseUrl}/assets`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setAllAssets(data);
        setFilteredAssets(data);
      } catch (err) {
        setError(
          "Failed to fetch assets. Please make sure the backend server is running."
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  // Effect to filter assets whenever the search term changes
  useEffect(() => {
    const results = allAssets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAssets(results);
    setCurrentPage(1); // Reset to first page on new search
  }, [searchTerm, allAssets]);

  // Pagination logic
  const indexOfLastAsset = currentPage * assetsPerPage;
  const indexOfFirstAsset = indexOfLastAsset - assetsPerPage;
  const currentAssets = filteredAssets.slice(
    indexOfFirstAsset,
    indexOfLastAsset
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: "#6366F1" },
      }}
    >
      <div className="bg-gray-900 min-h-screen text-white pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header and Filters */}
          <header className="mb-12 text-center">
            <h1 className="text-5xl font-extrabold tracking-tight">
              Marketplace
            </h1>
            <p className="mt-4 text-xl text-gray-400">
              Discover, collect, and trade unique digital assets.
            </p>
            <div className="max-w-xl mx-auto mt-8">
              <Search
                placeholder="Search by name or description..."
                onSearch={(value) => setSearchTerm(value)}
                onChange={(e) => setSearchTerm(e.target.value)}
                enterButton
                size="large"
              />
            </div>
          </header>

          {/* Main Content Area */}
          <main>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : error ? (
              <div className="flex justify-center">
                <Alert
                  message="Error"
                  description={error}
                  type="error"
                  showIcon
                />
              </div>
            ) : currentAssets.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {currentAssets.map((asset) => (
                    <AssetCard key={asset.tokenId} asset={asset} />
                  ))}
                </div>
                {filteredAssets.length > assetsPerPage && (
                  <div className="mt-16 flex justify-center">
                    <Pagination
                      current={currentPage}
                      pageSize={assetsPerPage}
                      total={filteredAssets.length}
                      onChange={handlePageChange}
                      showSizeChanger={false}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <h3 className="text-2xl font-semibold text-gray-300">
                  No Assets Found
                </h3>
                <p className="text-gray-500 mt-2">
                  Your search for "{searchTerm}" did not match any assets. Try a
                  different search.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
}
