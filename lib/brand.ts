/**
 * Identité de l'exploitation — source unique.
 *
 * Le nom apparaissait auparavant en dur à trente-huit endroits : écrans,
 * messages d'erreur, gabarits d'e-mail et pieds de page des PDF. Le changer
 * demandait de les retrouver tous, et d'en oublier un. Tout passe désormais
 * par ce fichier.
 *
 * `name` est la marque, celle que voient les clients. `legalName` est la
 * raison sociale, qui engage juridiquement et doit figurer sur les factures :
 * ce sont deux choses distinctes, même quand elles se ressemblent.
 */
export const BRAND = {
  /** Marque commerciale, affichée partout dans l'interface et les e-mails. */
  name: 'La Ferme des Chopin',

  /** Décomposition pour l'enseigne sur deux lignes (connexion, barre latérale). */
  nameTop: 'La Ferme',
  nameBottom: 'des Chopin',

  /**
   * Raison sociale — mentions légales, factures, bons de livraison.
   * ← À CONFIRMER auprès de l'exploitation avant la première facture réelle :
   *   dénomination exacte au registre, SIRET et TVA intracommunautaire.
   */
  legalName: 'SCEA Chopin',

  domain: 'fermedeschopin.fr',
  contactEmail: 'contact@fermedeschopin.fr',
  /** Site public. NEXT_PUBLIC_SITE_URL le surcharge en développement. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fermedeschopin.fr',

  address: {
    street: '11 rue de la Maladrerie',
    zip: '62124',
    city: 'Beaumetz-lès-Cambrai',
    region: 'Hauts-de-France',
    country: 'France',
  },
} as const

/** Pied de page des documents imprimés. */
export const BRAND_FOOTER = `${BRAND.legalName} · ${BRAND.address.city}`
