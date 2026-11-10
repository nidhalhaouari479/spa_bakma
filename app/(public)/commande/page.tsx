import type { Metadata } from "next";
import { CheckoutView } from "./CheckoutView";

export const metadata: Metadata = { title: "Finaliser ma commande" };

export default function CheckoutPage() {
  return <CheckoutView />;
}
