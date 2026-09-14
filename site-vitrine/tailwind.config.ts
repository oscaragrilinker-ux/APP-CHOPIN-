import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Palette relevée directement sur les photos de l'exploitation :
      // la craie du ciel d'hiver, la terre labourée, le vert des cultures.
      // Registre papier kraft : lin écru, encre brune, terre labourée.
      colors: {
        paper: '#EDE6D5',   // lin écru — le fond, chaud et légèrement grené
        // Voile translucide de l'en-tête. Déclaré comme couleur propre : le
        // modificateur d'opacité (bg-paper/92) n'est pas généré à l'intérieur
        // d'une variante d'attribut data-[…].
        'paper-veil': 'rgb(237 230 213 / 0.92)',
        bone:  '#DDD1B8',   // kraft plus soutenu : filets, surfaces en retrait
        ink:   '#1F1A11',   // encre brun-noir, jamais du noir pur
        night: '#241E14',   // bandeaux sombres — terre d'ombre, pas du charbon
        field: '#55702F',   // vert de culture, légèrement olive
        soil:  '#8A6A44',   // terre labourée
        rust:  '#A8502F',   // brique et machine — accent chaud, très parcimonieux

        // Conservés pour compatibilité.
        forest: '#1F3D2B',
        gold: '#8A6A44',
        cream: '#EDE6D5',
        creamMuted: '#DDD1B8',
      },
      fontFamily: {
        // Une seule superfamille, jouée sur un contraste de graisse extrême.
        // Anton porte les titres, Archivo le texte courant, Caveat l'accent
        // manuscrit. Trois rôles, trois caractères, aucun décor en trop.
        sans:    ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-anton)', 'Impact', 'sans-serif'],
        script:  ['var(--font-caveat)', 'cursive'],
        serif:   ['var(--font-anton)', 'Impact', 'sans-serif'],
      },
      letterSpacing: {
        brand: '0.02em',
        label: '0.18em',
        wide2: '0.12em',
        tightest: '-0.035em',
      },
      maxWidth: {
        measure: '58ch',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.16,1,.3,1)',
      },
    },
  },
  plugins: [],
}

export default config
