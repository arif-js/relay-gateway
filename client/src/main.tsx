import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

const publishableKey =
  (typeof window !== 'undefined' && (window as unknown as { __CLERK_PUBLISHABLE_KEY__?: string }).__CLERK_PUBLISHABLE_KEY__) ||
  '';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ClerkErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Clerk script error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function ClerkWrapper({
  publishableKey,
  children,
}: {
  publishableKey: string;
  children: React.ReactNode;
}) {
  const [clerkFailed, setClerkFailed] = useState(false);

  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = typeof e.reason?.message === 'string' ? e.reason.message : '';
      const code = e.reason?.code;
      if (code === 'failed_to_load_clerk_js' || msg.includes('failed to load script')) {
        setClerkFailed(true);
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  if (clerkFailed) {
    return (
      <App
        hasClerk={false}
        clerkError="Clerk custom domain DNS setup pending: clerk.arifcodes.com does not resolve yet in DNS."
      />
    );
  }

  return (
    <ClerkErrorBoundary
      fallback={
        <App
          hasClerk={false}
          clerkError="Clerk custom domain DNS setup pending: clerk.arifcodes.com does not resolve yet in DNS."
        />
      }
    >
      <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
    </ClerkErrorBoundary>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {publishableKey ? (
        <ClerkWrapper publishableKey={publishableKey}>
          <App hasClerk={true} />
        </ClerkWrapper>
      ) : (
        <App hasClerk={false} />
      )}
    </React.StrictMode>
  );
}
