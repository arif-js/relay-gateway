import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { DocsPage } from './pages/DocsPage';
import { OpenSourcePage } from './pages/OpenSourcePage';
import { PricingPage } from './pages/PricingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TenantPage } from './pages/TenantPage';
import { ConnectPage } from './pages/ConnectPage';

export function App({
  hasClerk = false,
  clerkError,
}: {
  hasClerk?: boolean;
  clerkError?: string;
}) {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let title = 'Relay Gateway — Multi-tenant Telegram messaging for developers';
    if (currentPath === '/docs') {
      title = 'API Reference · Relay Gateway';
    } else if (currentPath === '/open-source') {
      title = 'Open-Source & Self-Host Guide · Relay Gateway';
    } else if (currentPath === '/pricing') {
      title = 'Pricing · Relay Gateway';
    } else if (currentPath === '/login' || currentPath === '/dashboard/login') {
      title = 'Sign In · Relay Gateway';
    } else if (currentPath === '/signup') {
      title = 'Create Account · Relay Gateway';
    } else if (currentPath.startsWith('/dashboard/tenants/')) {
      title = 'Tenant Details · Relay Gateway';
    } else if (currentPath === '/dashboard') {
      title = 'Console · Relay Gateway';
    } else if (currentPath.startsWith('/connect/')) {
      title = 'Connect Bot · Relay Gateway';
    }
    document.title = title;
  }, [currentPath]);

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  // Connect onboarding page (standalone layout)
  if (currentPath.startsWith('/connect/')) {
    const token = currentPath.split('/connect/')[1]?.split('/')[0] || '';
    return <ConnectPage token={token} />;
  }

  const hasKey = typeof window !== 'undefined' ? Boolean(localStorage.getItem('relay_admin_key')) : false;

  // Determine current page
  let content: React.ReactNode;
  if (currentPath === '/docs') {
    content = <DocsPage navigate={navigate} />;
  } else if (currentPath === '/open-source') {
    content = <OpenSourcePage navigate={navigate} />;
  } else if (currentPath === '/pricing') {
    content = <PricingPage navigate={navigate} />;
  } else if (currentPath === '/login' || currentPath === '/dashboard/login') {
    content = (
      <LoginPage
        navigate={navigate}
        initialMode="sign-in"
        hasClerk={hasClerk}
        clerkError={clerkError}
      />
    );
  } else if (currentPath === '/signup') {
    content = (
      <LoginPage
        navigate={navigate}
        initialMode="sign-up"
        hasClerk={hasClerk}
        clerkError={clerkError}
      />
    );
  } else if (currentPath.startsWith('/dashboard/tenants/')) {
    if (!hasKey && !hasClerk) {
      content = (
        <LoginPage
          navigate={navigate}
          initialMode="sign-in"
          hasClerk={hasClerk}
          clerkError={clerkError}
        />
      );
    } else {
      const tenantId = currentPath.split('/dashboard/tenants/')[1]?.split('/')[0] || '';
      content = <TenantPage tenantId={tenantId} navigate={navigate} />;
    }
  } else if (currentPath === '/dashboard') {
    if (!hasKey && !hasClerk) {
      content = (
        <LoginPage
          navigate={navigate}
          initialMode="sign-in"
          hasClerk={hasClerk}
          clerkError={clerkError}
        />
      );
    } else {
      content = <DashboardPage navigate={navigate} hasClerk={hasClerk} />;
    }
  } else {
    content = <LandingPage navigate={navigate} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f6] text-[#1a1714]">
      <Navbar currentPath={currentPath} navigate={navigate} hasClerk={hasClerk} />
      <main className="flex-1">{content}</main>
      <Footer navigate={navigate} />
    </div>
  );
}

export default App;
