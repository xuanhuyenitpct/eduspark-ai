// @ts-nocheck
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Kiểu dữ liệu đơn giản cho context
const ApiContext = createContext({
  apiKey: null as string | null,
  setApiKey: (key: string | null) => {},
});

// Lấy API key từ biến môi trường Vite (Vercel đang set VITE_GEMINI_API_KEY)
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;

// Provider dùng trong App.tsx
export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  // Khi client mount, lấy key từ localStorage hoặc ENV
  useEffect(() => {
    if (typeof window === "undefined") {
      setApiKeyState(ENV_API_KEY ?? null);
      return;
    }
    const stored = window.localStorage.getItem("gemini-api-key");
    setApiKeyState(stored || ENV_API_KEY || null);
  }, []);

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (typeof window !== "undefined") {
      if (key) {
        window.localStorage.setItem("gemini-api-key", key);
      } else {
        window.localStorage.removeItem("gemini-api-key");
      }
    }
  };

  return (
    <ApiContext.Provider value={{ apiKey, setApiKey }}>
      {children}
    </ApiContext.Provider>
  );
};

// Hook dùng trong các component con
export const useApiKey = () => useContext(ApiContext);
