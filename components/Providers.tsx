"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { ToastProvider } from "./ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <FavoritesProvider>{children}</FavoritesProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
