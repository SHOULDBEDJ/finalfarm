import React, { createContext, useContext, useState } from "react";
import { Loader2 } from "lucide-react";

interface GlobalLoaderContextType {
  showLoader: (duration?: number) => Promise<void>;
  isLoading: boolean;
}

const GlobalLoaderContext = createContext<GlobalLoaderContextType | undefined>(undefined);

export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const showLoader = async (duration = 1500) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, duration));
    setIsLoading(false);
  };

  return (
    <GlobalLoaderContext.Provider value={{ showLoader, isLoading }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-navy/80 backdrop-blur-md transition-all duration-300">
          <div className="relative">
            {/* Attractive Gold Spinner */}
            <div className="h-24 w-24 rounded-full border-4 border-gold/20 border-t-gold animate-spin shadow-[0_0_20px_rgba(212,175,55,0.4)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white animate-pulse">16</span>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold tracking-widest text-gold uppercase animate-bounce">Processing</h2>
            <p className="mt-2 text-sm text-white/60 tracking-wider">Please wait while we secure your data...</p>
          </div>
        </div>
      )}
    </GlobalLoaderContext.Provider>
  );
}

export const useGlobalLoader = () => {
  const context = useContext(GlobalLoaderContext);
  if (!context) throw new Error("useGlobalLoader must be used within a GlobalLoaderProvider");
  return context;
};
