export const siteConfig = {
  brandName: "LA FERME",
  brandSubtitle: "DES CHOPIN",
  baseline: "POMMES DE TERRE & OIGNONS",
  pillars: ["ULTRA LOCAL", "QUALITÉ SUPÉRIEURE", "CIRCUIT COURT"] as const,
  legalName: "SCEA Chopin",          // ← À CONFIRMER : raison sociale exacte pour les factures
  domain: "lafermedeschopin.fr",
  address: {
    street: "11 rue de la Maladrerie",
    zip: "62124",
    city: "Beaumetz-lès-Cambrai",
    region: "Hauts-de-France",
    country: "France",
  },
  contactPhone: "+33 3 00 00 00 00",    // ← À REMPLACER par le vrai numéro
  contactEmail: "contact@lafermedeschopin.fr",
  formspreeId: "xxxxxxxx",              // ← À REMPLACER par l'ID Formspree réel (https://formspree.io)
  orderAppUrl: "/app",                  // ← URL de l'espace commande (app interne)
  mapsQuery: "11 rue de la Maladrerie, 62124 Beaumetz-lès-Cambrai",

  // Chiffres affichés en page d'accueil. ← À CONFIRMER avec l'exploitation.
  figures: [
    { value: 1972, label: "l'année du premier chicon", suffix: "" },
    { value: 3,    label: "générations aux commandes", suffix: "" },
    { value: 3,    label: "produits, travaillés en propre", suffix: "" },
  ],

  // ← À COMPLÉTER : certifications réellement détenues.
  certifications: [] as readonly { name: string; detail: string }[],

  // Produits travaillés. L'échalote est ajoutée d'après les photos fournies.
  // ← À CONFIRMER : s'agit-il bien d'une production de la maison ?
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
    {
      slug: 'echalotes',
      name: 'Échalotes',
      photo: '/images/photos/echalotes.jpg',
      alt: "Gros plan d'échalotes",
      brief: "Gros plan d'échalotes, cadrage carré",
      lead:
        "Calibrées et triées sur la même ligne, avec la même exigence de régularité.",
      varieties: ['Longue', 'Demi-longue'],
      formats: ['Caisse 2,5 kg', 'Sac 5 kg'],
    },
  ] as const,
} as const
