// TODO étape 1 — Shell avec sidebar, nav et cloche notifications
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-primary p-4 text-primary-foreground">
        <p className="text-lg font-serif font-semibold">Chopin</p>
        <nav className="mt-8 text-sm opacity-70">(navigation — étape 1)</nav>
      </aside>
      <main className="flex-1 bg-background p-8">{children}</main>
    </div>
  )
}
