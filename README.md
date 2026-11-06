# Bakma Store — site public & espace client

Application Next.js 16 (App Router, Tailwind v4) : catalogue public des animaux et espace des particuliers (port 3000).
Données et sécurité : Supabase (policies RLS + RPC, voir `../supabase/schema.sql`).

## Démarrer

```bash
cp .env.example .env.local   # renseigner les clés Supabase et les URLs des 3 applications
npm install
npm run dev                  # http://localhost:3000
```

`npm run build` et `npm run lint` doivent passer avant toute livraison.

## Routes

| Route | Description |
|---|---|
| `/` | Accueil : recherche, catégories, animaux récents, « Comment ça marche » |
| `/animaux` | Liste filtrable (q, ville, categorie, type, age, sexe, prixMin, prixMax, sort, page) |
| `/animaux/[id]` | Fiche animal : galerie, santé, propriétaire, carte, animaux similaires, signalement |
| `/comment-ca-marche`, `/a-propos` | Pages de contenu |
| `/connexion`, `/inscription` | Authentification (e-mail, Google, Apple) — rôles Particulier / Vétérinaire |
| `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe` | Réinitialisation du mot de passe |
| `/espace` | Tableau de bord (connexion requise) |
| `/espace/annonces` (+ `/nouvelle`, `/[id]`, `/[id]/modifier`) | Mes annonces : création multi-étapes, suivi du workflow, rapport vétérinaire |
| `/espace/favoris`, `/espace/messages`, `/espace/notifications`, `/espace/profil` | Favoris, messagerie temps réel, notifications, profil |

## Organisation

- `app/(public)/*` : pages publiques (header + footer communs) ; `app/espace/*` : espace client (garde d'auth + sidebar).
- `components/site/*` : header, footer, cartes animal, barre de recherche, écrans d'auth ; `components/espace/*` : navigation, formulaire d'annonce, stepper.
- `hooks/useQuery.ts` (chargement Supabase dans un effet), `useFavorites`, `useUnread` (compteurs temps réel), `useRefData` (villes / catégories).
- `lib/catalog.ts` (sélections PostgREST, filtres d'âge), `lib/workflow.ts` (règles d'édition / soumission).

Les pages sont des composants client : `getSupabase()` n'est jamais appelé pendant le rendu serveur.
