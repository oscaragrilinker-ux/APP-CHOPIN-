import { Photo } from './Photo'

type PageHeroProps = {
  eyebrow: string
  title: string
  lede: string
  photo?: { src: string; alt: string; brief: string }
}

/**
 * Ouverture de page intérieure : même registre que l'accueil, en plus court.
 * Le titre est calé à gauche, sur une photo assombrie quand il y en a une.
 */
export function PageHero({ eyebrow, title, lede, photo }: PageHeroProps) {
  return (
    <section className="relative isolate flex min-h-[52svh] flex-col justify-end overflow-hidden bg-night">
      {photo && (
        <>
          <Photo
            src={photo.src}
            alt={photo.alt}
            brief={photo.brief}
            className="absolute inset-0 -z-10 size-full"
            imgClassName="brightness-[0.62]"
            priority
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/50 to-night/15"
          />
        </>
      )}

      <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-32 sm:px-6 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-label text-field">{eyebrow}</p>
        <h1 className="mt-4 max-w-[15ch] font-display text-[clamp(2.25rem,6.5vw,5rem)] font-black uppercase leading-[0.9] tracking-tightest text-paper">
          {title}
        </h1>
        <p className="mt-6 max-w-measure text-[15px] leading-relaxed text-paper/75">{lede}</p>
      </div>
    </section>
  )
}
