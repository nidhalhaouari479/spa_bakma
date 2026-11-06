import { PawPrint } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-[#e6f4fa] to-page px-4">
      <div className="text-center">
        <Logo height={50} className="inline-block" />
        <p className="mt-8 text-7xl font-extrabold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-extrabold">Page introuvable</h1>
        <p className="mt-2 text-body">Cette page s&apos;est échappée… comme un chaton curieux.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/">Retour à l&apos;accueil</Button>
          <Button href="/animaux" variant="outline" icon={<PawPrint className="size-4" />}>
            Voir les animaux
          </Button>
        </div>
      </div>
    </div>
  );
}
