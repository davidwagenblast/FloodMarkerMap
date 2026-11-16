const LINKS = [
  { page: 'map', href: '#/', label: 'Map' },
  { page: 'about', href: '#/about', label: 'About' },
  { page: 'contribute', href: '#/contribute', label: 'Contribute' },
];

export default function Header({ page }) {
  return (
    <header class="header">
      <a class="logo" href="#/">open<wbr />Princeton<wbr />FloodMap</a>
      <nav class="nav">
        {LINKS.map((l) => (
          <a key={l.page} href={l.href} aria-current={l.page === page ? 'page' : undefined}>
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
