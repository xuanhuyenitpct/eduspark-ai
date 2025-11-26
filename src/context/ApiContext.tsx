// @ts-nocheck
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Lấy API key từ Vercel (Vite)
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;

type ApiContextValue = {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  // hàm helper dùng trong các view: truyền cho nó 1 hàm async nhận key
  runWithApiKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  // hàm xử lý lỗi chung
  handleError: (err: unknown) => void;
};

const ApiContext = createContext<ApiContextValue | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  // Khi app load: lấy key từ localStorage, nếu không có thì dùng ENV
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
    if (typeof window === "undefined") return;

    if (key) {
      window.localStorage.setItem("gemini-api-key", key);
    } else {
      window.localStorage.removeItem("gemini-api-key");
    }
  };

  // Luôn lấy key từ context hoặc từ ENV
  const getEffectiveKey = (): string => {
    const key = apiKey || ENV_API_KEY || "";
    if (!key) {
      throw new Error("API Key is not set");
    }
    return key;
  };

  const runWithApiKey = async <T,>(
    fn: (key: string) => Promise<T>
  ): Promise<T> => {
    const key = getEffectiveKey();
    return fn(key);
  };

  const handleError = (err: unknown) => {
    console.error("Gemini error:", err);
    // sau này bạn có thể bổ sung toast hiển thị lỗi đẹp hơn ở đây
  };

  return (
    <ApiContext.Provider
      value={{ apiKey, setApiKey, runWithApiKey, handleError }}
    >
      {children}
    </ApiContext.Provider>
  );
};

export const useApiKey = () => {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error("useApiKey must be used within an ApiProvider");
  }
  return ctx;
};
