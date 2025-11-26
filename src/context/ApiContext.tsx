import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type ApiKeyContextType = {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
};

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

// Lấy API key từ biến môi trường Vite
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;

export const ApiKeyProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  // Khi client mount, lấy key từ localStorage hoặc từ ENV
  useEffect(() => {
    if (typeof window === "undefined") {
      setApiKeyState(ENV_API_KEY ?? null);
      return;
    }
    const fromStorage = window.localStorage.getItem("gemini-api-key");
    setApiKeyState(fromStorage || ENV_API_KEY || null);
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
    <ApiKeyContext.Provider value={{ apiKey, setApiKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = () => {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) {
    throw new Error("useApiKey must be used within an ApiKeyProvider");
  }
  return ctx;
};
