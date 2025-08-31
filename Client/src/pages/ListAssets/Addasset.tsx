import React, { useState, createContext, useContext } from "react";
import {
  Form,
  Input,
  Button,
  Upload,
  message,
  Spin,
  ConfigProvider,
  theme,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
// To fix the compilation error, you must install the ethers.js library.
// Open your terminal in your React project folder and run:
// npm install ethers
import { ethers } from "ethers";

// --- Authentication Context (Placeholder) ---
// This context is included here to make the component self-contained and fix the import error.
// You should replace the import in this file with the correct path to your actual AuthContext file.
const AuthContext = createContext(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // This provides mock data so the component can render without your full app context.
    // For the real functionality to work, your App must be wrapped in your actual AuthProvider.
    console.warn(
      "useAuth hook is used outside of its Provider. Using mock data."
    );
    return { currentAccount: "0x1234567890AbCdEf1234567890AbCdEf12345678" };
  }
  return context;
};

const { TextArea } = Input;

const AddAsset = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [fileList, setFileList] = useState([]);

  const { currentAccount } = useAuth();

  const apiBaseUrl = import.meta.env.VITE_PORT;

  const handleFinish = async (values) => {
    if (!currentAccount) {
      message.error("Please connect your wallet first!");
      return;
    }
    if (fileList.length === 0) {
      message.error("Please upload an image for the asset!");
      return;
    }

    setLoading(true);

    try {
      setLoadingMessage("Uploading asset details to the server...");
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("description", values.description);
      formData.append("file", fileList[0].originFileObj);

      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error(
          "Authentication token not found. Please sign in again."
        );
      }

      const response = await fetch(`${apiBaseUrl}/assets/mint-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "Failed to get minting transaction from the server."
        );
      }

      const { unsignedTx } = await response.json();

      setLoadingMessage("Please approve the transaction in your wallet...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const txResponse = await signer.sendTransaction(unsignedTx);

      setLoadingMessage("Waiting for transaction confirmation...");
      await txResponse.wait();

      message.success("Asset minted successfully!");
    } catch (error) {
      console.error("Failed to mint asset:", error);
      message.error(
        error.message || "An unexpected error occurred during minting."
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const uploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      setFileList([file]);
      return false; // Prevent antd from automatically uploading
    },
    fileList,
    listType: "picture",
    maxCount: 1,
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: "#6366F1" },
      }}
    >
      <div className="bg-gray-900 min-h-screen text-white pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <header className="mb-12 text-center">
            <h1 className="text-5xl font-extrabold tracking-tight">
              Tokenize Your Asset
            </h1>
            <p className="mt-4 text-xl text-gray-400">
              Bring your high-value items onto the blockchain. Fill out the
              details below to mint your asset as a unique NFT.
            </p>
          </header>

          <main className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
            <Spin spinning={loading} tip={loadingMessage} size="large">
              <Form
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{ remember: true }}
                autoComplete="off"
              >
                <Form.Item
                  label={<span className="text-white">Asset Name</span>}
                  name="name"
                  rules={[
                    { required: true, message: "Please input the asset name!" },
                  ]}
                >
                  <Input
                    placeholder="e.g., Hyderabadi Pearl Necklace"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="text-white">Description</span>}
                  name="description"
                  rules={[
                    {
                      required: true,
                      message: "Please provide a description!",
                    },
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Describe your asset in detail..."
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="text-white">Asset Image</span>}
                  name="image"
                  rules={[
                    { required: true, message: "Please upload an image!" },
                  ]}
                >
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>Click to Upload</Button>
                  </Upload>
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={loading}
                  >
                    Create Mint Request & Mint
                  </Button>
                </Form.Item>
              </Form>
            </Spin>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default AddAsset;
