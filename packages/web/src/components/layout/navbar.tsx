'use client';

import { usePathname, useRouter } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Genel Bakış' },
  { href: '/dashboard/users', label: 'Kullanıcılar' },
  { href: '/survey/ocai', label: 'OCAI Anket' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem('token');
    router.replace('/auth/login');
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <div style={styles.left}>
          <div style={styles.logo}>QA</div>
          <span style={styles.brand}>CVF-QA</span>
          <div style={styles.links}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
              return (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    ...styles.link,
                    ...(isActive ? styles.linkActive : {}),
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Çıkış Yap
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    background: '#0F1D2F',
    height: 56,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  inner: {
    maxWidth: 1200,
    margin: '0 auto',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #2E86AB, #3A9BC5)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  brand: {
    color: '#fff',
    fontWeight: 600,
    fontSize: 16,
    marginRight: 8,
  },
  links: {
    display: 'flex',
    gap: 4,
    marginLeft: 16,
  },
  link: {
    color: 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: 6,
    transition: 'all 0.15s',
  },
  linkActive: {
    color: '#fff',
    background: 'rgba(255,255,255,0.12)',
  },
  logoutBtn: {
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.7)',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
