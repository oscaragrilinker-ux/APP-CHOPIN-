-- Extensions Postgres nécessaires au projet Chopin
-- À appliquer en premier avant toutes les autres migrations

-- Génération d'UUID (gen_random_uuid) — fourni par pgcrypto
-- Sans WITH SCHEMA : Supabase installe dans le schema 'extensions' par défaut,
-- qui est dans le search_path → les fonctions restent accessibles depuis public.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recherche textuelle trigram sur noms de clients/produits
-- Permet les LIKE '%texte%' rapides via index GIN
CREATE EXTENSION IF NOT EXISTS pg_trgm;
