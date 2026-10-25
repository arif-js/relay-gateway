import React, { useState } from 'react';
import { Button } from 'raditail';
import { Terminal, LogOut, Menu, X, ArrowRight } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  hasClerk?: boolean;
}

export function Navbar({ currentPath, navigate, hasClerk = false }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthRoute =
    currentPath === '/login' ||
    currentPath === '/signup' ||
    currentPath === '/dashboard/login';

  const hasKey = typeof window !== 'undefined' ? Boolean(localStorage.getItem('relay_admin_key')) : false;
  const showAdminLogout = hasKey && !isAuthRoute;

  const handleAdminLogout = async () => {
    try {
      localStorage.removeItem('relay_admin_key');
      await fetch('/dashboard/logout', { method: 'POST' });
    } catch {}
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const links = [
    { href: '/', label: 'Overview' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/docs', label: 'API Docs' },
    { href: '/open-source', label: 'Open Source' },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (href === '/dashboard') {
      navigate(hasKey || hasClerk ? '/dashboard' : '/login');
    } else {
      navigate(href);
    }
  };

  return (
    <header className="border-b border-[#e2dbd1] bg-[#fbf9f6]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setMobileMenuOpen(false);
            navigate('/');
          }}
          className="flex items-center gap-2.5 text-[#18181b] no-underline border-0 group shrink-0"
        >
          <img
            src="/assets/logo.png"
            alt="Relay Gateway Logo"
            className="h-6 sm:h-7 w-auto object-contain transition-transform group-hover:scale-105 mix-blend-multiply"
          />
          <span className="font-serif font-medium text-lg sm:text-xl text-[#18181b] tracking-tight whitespace-nowrap">
            Relay<span className="text-[#b4532a] ml-1 font-normal">Gateway</span>
          </span>
        </a>

        {/* Center: Editorial Segmented Navigation Pill */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-1 bg-[#f4efeb]/90 border border-[#e2dbd1] p-1 rounded-xl shadow-2xs"
        >
          {links.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className={`no-underline border-0 text-[13px] px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#18181b] font-semibold shadow-xs ring-1 ring-[#e2dbd1]'
                    : 'text-[#52525b] font-medium hover:text-[#18181b] hover:bg-white/60'
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#b4532a]" />}
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Right: Auth / Console Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {hasClerk ? (
            <ClerkUserSection
              currentPath={currentPath}
              navigate={(path) => {
                setMobileMenuOpen(false);
                navigate(path);
              }}
              isAuthRoute={isAuthRoute}
              hasKey={hasKey}
              onAdminLogout={handleAdminLogout}
            />
          ) : showAdminLogout ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-[#18181b] hover:bg-[#3f3e3a] text-white rounded-lg text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 shadow-sm"
                onClick={() => handleNavClick('/dashboard')}
              >
                <Terminal className="w-3.5 h-3.5 text-[#cfc6b9]" />
                <span>Console</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5"
                onClick={handleAdminLogout}
                title="Sign out of Console"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="bg-[#18181b] hover:bg-[#3f3e3a] text-white rounded-lg text-xs font-medium px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm"
              onClick={() => handleNavClick('/dashboard')}
            >
              <Terminal className="w-3.5 h-3.5 text-[#cfc6b9]" />
              <span>Console</span>
            </Button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#52525b] hover:text-[#18181b] hover:bg-[#f4efeb] border border-transparent hover:border-[#e2dbd1] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e2dbd1] bg-[#fbf9f6] px-4 py-3 space-y-1.5 shadow-md">
          {links.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className={`no-underline border-0 flex items-center justify-between text-sm px-3.5 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#f4efeb] text-[#18181b] font-semibold border border-[#e2dbd1]'
                    : 'text-[#52525b] font-medium hover:text-[#18181b] hover:bg-[#f4efeb]/60'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#b4532a]" />}
                  {link.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#71717a]" />
              </a>
            );
          })}
          <div className="pt-2 mt-2 border-t border-[#e2dbd1] flex items-center gap-2">
            <Button
              size="sm"
              className="w-full bg-[#18181b] hover:bg-[#3f3e3a] text-white text-xs font-medium py-2 flex items-center justify-center gap-1.5"
              onClick={() => handleNavClick('/dashboard')}
            >
              <Terminal className="w-3.5 h-3.5 text-[#cfc6b9]" />
              <span>Open Console</span>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function ClerkUserSection({
  currentPath,
  navigate,
  isAuthRoute,
  hasKey,
  onAdminLogout,
}: {
  currentPath: string;
  navigate: (path: string) => void;
  isAuthRoute: boolean;
  hasKey: boolean;
  onAdminLogout: () => void;
}) {
  const { isSignedIn } = useUser();
  const isInConsole = currentPath.startsWith('/dashboard');

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2.5">
        <Button
          size="sm"
          className={`rounded-lg text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 shadow-sm transition-colors ${
            isInConsole
              ? 'bg-[#b4532a] hover:bg-[#9c421e] text-white'
              : 'bg-[#18181b] hover:bg-[#3f3e3a] text-white'
          }`}
          onClick={() => navigate('/dashboard')}
        >
          <Terminal className="w-3.5 h-3.5 text-[#f3e3d9] shrink-0" />
          <span>My Tenants</span>
        </Button>
        <UserButton />
      </div>
    );
  }

  if (hasKey && !isAuthRoute) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="bg-[#18181b] hover:bg-[#3f3e3a] text-white rounded-lg text-xs font-medium px-3 py-1.5 flex items-center gap-1.5 shadow-sm"
          onClick={() => navigate('/dashboard')}
        >
          <Terminal className="w-3.5 h-3.5 text-[#cfc6b9]" />
          <span>Console</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5"
          onClick={onAdminLogout}
          title="Sign out of Master Console"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:inline-flex bg-white hover:bg-[#f4efeb] border-[#cfc6b9] text-[#18181b] rounded-lg text-xs font-medium px-3.5 py-1.5"
        onClick={() => navigate('/login')}
      >
        Sign In
      </Button>
      <Button
        size="sm"
        className="bg-[#b4532a] hover:bg-[#9c421e] text-white rounded-lg text-xs font-medium px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        onClick={() => navigate('/signup')}
      >
        <span>Get Started</span>
        <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
      </Button>
    </div>
  );
}

export default Navbar;
