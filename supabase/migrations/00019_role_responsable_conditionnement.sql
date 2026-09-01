-- ═════════════════════════════════════════════════════════════════════════════
-- 00019 — Rôle « responsable conditionnement »
--
-- Chef d'atelier : mêmes données que le conditionnement (jamais les prix), plus
-- la main sur l'ordre de passage des commandes en préparation.
--
-- Cette migration ne contient QUE l'ajout de la valeur d'énumération.
-- PostgreSQL refuse d'utiliser une valeur d'enum fraîchement ajoutée dans la
-- même transaction que son ALTER TYPE ; tout le reste vit donc dans 00020.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'responsable_conditionnement';
