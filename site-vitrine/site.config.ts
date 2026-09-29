export const siteConfig = {
  brandName: "LA FERME",
  brandSubtitle: "DES CHOPIN",
  baseline: "POMMES DE TERRE & OIGNONS",
  pillars: ["ULTRA LOCAL", "QUALITÉ SUPÉRIEURE", "CIRCUIT COURT"] as const,
  legalName: "SCEA Chopin",          // ← À CONFIRMER : raison sociale exacte pour les factures
  domain: "fermedeschopin.fr",
  address: {
    street: "11 rue de la Maladrerie",
    zip: "62124",
    city: "Beaumetz-lès-Cambrai",
    region: "Hauts-de-France",
    country: "France",
  },
  contactPhone: "+33 3 00 00 00 00",    // ← À REMPLACER par le vrai numéro
  contactEmail: "contact@fermedeschopin.fr",
  formspreeId: "xxxxxxxx",              // ← À REMPLACER par l'ID Formspree réel (https://formspree.io)
  // Espace commande : l'application métier, hébergée sur son propre
  // sous-domaine. En local on la surcharge via NEXT_PUBLIC_APP_URL
  // (voir .env.local) pour pointer sur le serveur de développement.
  orderAppUrl: process.env.NEXT_PUBLIC_APP_URL || "https://espace.fermedeschopin.fr",
  mapsQuery: "11 rue de la Maladrerie, 62124 Beaumetz-lès-Cambrai",

  // Chiffres affichés en page d'accueil. ← À CONFIRMER avec l'exploitation.
  figures: [
    { value: 1972, label: "l'année du premier chicon", suffix: "" },
    { value: 3,    label: "générations aux commandes", suffix: "" },
    { value: 2,    label: "produits, travaillés en propre", suffix: "" },
  ],

  // ← À COMPLÉTER : certifications réellement détenues.
  certifications: [] as readonly { name: string; detail: string }[],

  // Produits travaillés. Pas d'échalote pour l'instant (confirmé par l'exploitation).
  products: [
    {
      slug: 'pommes-de-terre',
      name: 'Pommes de terre',
      photo: '/images/photos/champ.jpg',
      alt: 'Arracheuse automotrice de pommes de terre au crépuscule',
      brief: "L'arracheuse au crépuscule, phares allumés",
      lead:
        "Variétés de consommation et de transformation, triées et calibrées à la demande.",
      varieties: ['Bintje', 'Charlotte', 'Agata'],
      formats: ['Caisse 2,5 kg', 'Sac 5 kg', 'Big bag 25 kg'],
    },
    {
      slug: 'oignons',
      name: 'Oignons',
      photo: '/images/photos/oignons.jpg',
      alt: "Gros plan d'oignons jaunes",
      brief: "Gros plan d'oignons jaunes, cadrage carré",
      lead:
        "Jaunes et rouges, fermes et réguliers, conditionnés au plus près de la récolte.",
      varieties: ['Jaune', 'Rouge'],
      formats: ['Caisse 2,5 kg', 'Sac 5 kg', 'Big bag 25 kg'],
    },
  ] as const,
} as const
