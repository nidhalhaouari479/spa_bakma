"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { ProductFavoritesProvider } from "@/hooks/useProductFavorites";
import { ToastProvider } from "./ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <FavoritesProvider>
          <ProductFavoritesProvider>
            <CartProvider>{children}</CartProvider>
          </ProductFavoritesProvider>
        </FavoritesProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
