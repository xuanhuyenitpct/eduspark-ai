// @ts-nocheck
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const ApiContext = createContext({
  apiKey: null,
  setApiKey: (key: string | null) => {},
});

// Lấy API KEY từ Vercel (Vite)
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  // Khi app load, ưu tiên lấy từ localStorage → nếu không có thì dùng ENV
  useEffect(() => {
    if (typeof window === "undefined") {
      setApiKeyState(ENV_API_KEY ?? null);
      return;
    }

    const saved = window.localStorage.getItem("gemini-api-key");
    setApiKeyState(saved || ENV_API_KEY || null);
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

export const useApiKey = () => useContext(ApiContext);
