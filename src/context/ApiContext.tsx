import React, { createContext, useContext, PropsWithChildren, useState } from "react";
import { ApiKeyModal } from "../components/ApiKeyModal";

// Helper to avoid TS errors if types aren't fully set up in the editor
declare var process: { env: { API_KEY: string } };

interface ApiContextType {
  apiKey: string;
  isReady: boolean;
  runWithApiKey: (callback: () => Promise<any>) => Promise<any>;
  handleError: (err: any) => boolean; // Returns true if error was handled (e.g. quota limit)
}

const ApiContext = createContext<ApiContextType | null>(null);

export const ApiProvider = ({ children }: PropsWithChildren<{}>) => {
  // Check for environment variable first (injected via Vite config)
  const ENV_API_KEY = process.env.API_KEY || "";

  // Use key from env if available, otherwise check localStorage
  const [apiKey, setApiKey] = useState(() => {
      if (ENV_API_KEY) return ENV_API_KEY;
      return localStorage.getItem("gemini_api_key") || "";
  });
  
  const [showModal, setShowModal] = useState(false);

  // Hàm kiểm tra và xử lý lỗi Quota tập trung
  const checkAndHandleQuotaError = (err: any): boolean => {
      console.error("Checking API Error:", err);
      
      let errorString = "";
      
      // Ưu tiên lấy message nếu có
      if (err?.message) {
          errorString += err.message;
      }
      
      // Thử stringify object để bắt các lỗi JSON trả về từ API
      if (typeof err === "object") {
          try {
              errorString += " " + JSON.stringify(err);
          } catch (e) {
              // Ignore circular reference or other stringify errors
          }
      } else {
          errorString += " " + String(err);
      }
      
      // Kiểm tra các từ khóa lỗi 429 phổ biến (Hết Quota) và 403 (Key lỗi/Quyền truy cập)
      const isQuotaError = 
          errorString.includes("429") || 
          errorString.includes("Quota exceeded") || 
          errorString.includes("RESOURCE_EXHAUSTED") ||
          errorString.includes("quota") ||
          errorString.includes("403") ||
          errorString.includes("API_KEY_INVALID") ||
          errorString.includes("permission denied");

      if (isQuotaError) {
          // Only show modal if we are NOT using the env var (user can't change env var via modal)
          if (!ENV_API_KEY) {
             setShowModal(true);
          }
          return true;
      }
      return false;
  };

  const handleError = (err: any) => {
      return checkAndHandleQuotaError(err);
  };

  const runWithApiKey = async (callback: () => Promise<any>) => {
    try {
      return await callback();
    } catch (err: any) {
      if (checkAndHandleQuotaError(err)) {
        // Nếu đã xử lý lỗi quota, ném ra lỗi thân thiện để component dừng lại
        throw new Error("Hệ thống đang quá tải hoặc Key không hợp lệ. Vui lòng kiểm tra lại.");
      }
      // Ném lại các lỗi khác để component xử lý
      throw err;
    }
  };

  const handleSaveKey = (newKey: string) => {
      if (newKey && newKey.trim().length > 0) {
          setApiKey(newKey);
          localStorage.setItem("gemini_api_key", newKey);
          setShowModal(false);
      }
  };

  return (
    <ApiContext.Provider value={{ apiKey, isReady: !!apiKey, runWithApiKey, handleError }}>
      {children}
      {showModal && !ENV_API_KEY && <ApiKeyModal onSave={handleSaveKey} />}
    </ApiContext.Provider>
  );
};

export const useApiKey = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApiKey must be used within an ApiProvider");
  }
  return context;
};