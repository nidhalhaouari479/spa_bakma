import { BadgeCheck, HeartPulse, Home, ShieldCheck, Stethoscope, Upload, Users } from "lucide-react";

export const GUARANTEES = [
  { icon: ShieldCheck, label: "Animaux vérifiés" },
  { icon: HeartPulse, label: "En bonne santé" },
  { icon: Stethoscope, label: "Contrôle vétérinaire" },
  { icon: Users, label: "Adoption & Vente sécurisée" },
];

export const HOW_STEPS = [
  { icon: Upload, title: "Publiez", text: "Créez l'annonce de votre animal avec ses photos, sa santé et son caractère." },
  { icon: Stethoscope, title: "Vérification vétérinaire", text: "Un vétérinaire partenaire contrôle l'état de santé de l'animal et rédige un rapport." },
  { icon: BadgeCheck, title: "Validation", text: "Notre équipe valide l'annonce, qui devient visible par toute la communauté." },
  { icon: Home, title: "Adoption", text: "Échangez avec les adoptants en toute sécurité et offrez-lui un nouveau foyer." },
];
