import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Button, Badge } from 'raditail';
import { KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { SignIn, SignUp, useUser } from '@clerk/clerk-react';

export function LoginPage({
  navigate,
  initialMode = 'sign-in',
  hasClerk = false,
  clerkError,
}: {
  navigate: (path: string) => void;
  initialMode?: 'sign-in' | 'sign-up';
  hasClerk?: boolean;
  clerkError?: string;
}) {
  if (hasClerk) {
    return <ClerkAuthView navigate={navigate} initialMode={initialMode} />;
  }
  return (
    <div className="max-w-[480px] mx-auto px-6 py-14 md:py-20">
      <AdminKeyForm navigate={navigate} clerkError={clerkError} />
    </div>
  );
}

function ClerkAuthView({
  navigate,
  initialMode,
}: {
  navigate: (path: string) => void;
  initialMode: 'sign-in' | 'sign-up';
}) {
  const { isSignedIn, isLoaded } = useUser();
  const [mode] = useState<'sign-in' | 'sign-up'>(initialMode);
  const [showAdminKey, setShowAdminKey] = useState(false);

  // When already signed in via Clerk, redirect immediately to /dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard');
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="max-w-[480px] mx-auto px-6 py-24 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-2 border-[#b4532a] border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-[#71717a]">Opening your console…</p>
      </div>
    );
  }

  // Not signed in -> Render Clerk Sign In / Sign Up
  return (
    <div className="max-w-[500px] mx-auto px-6 py-8 sm:py-10 md:py-14 flex flex-col items-center">
      <div className="text-center mb-6">
        <Badge variant="outline" className="mb-2 text-xs font-mono uppercase text-[#b4532a] border-[#b4532a]/30">
          Relay Cloud · Free Preview
        </Badge>
        <h1 className="font-serif text-3xl text-[#1a1714] font-normal">
          {mode === 'sign-in' ? 'Sign In to Relay' : 'Create Your Free Account'}
        </h1>
        <p className="text-xs text-[#6e6459] mt-1.5">
          {mode === 'sign-in'
            ? 'Manage your up to 3 tenants, Telegram bots, webhooks, and API keys.'
            : 'Includes up to 3 isolated tenants and 3 dedicated Telegram bots free.'}
        </p>
      </div>

      <div className="w-full max-w-full flex justify-center mb-6">
        {mode === 'sign-in' ? (
          <SignIn
            routing="hash"
            signUpUrl="/signup"
            appearance={{
              elements: {
                rootBox: 'w-full flex justify-center',
                card: 'w-full max-w-full border border-[#e2dbd1] shadow-sm rounded-xl',
                formButtonPrimary: 'bg-[#b4532a] hover:bg-[#9c421e] text-sm',
                footerActionLink: 'text-[#b4532a] hover:text-[#9c421e]',
              },
            }}
          />
        ) : (
          <SignUp
            routing="hash"
            signInUrl="/login"
            appearance={{
              elements: {
                rootBox: 'w-full flex justify-center',
                card: 'w-full max-w-full border border-[#e2dbd1] shadow-sm rounded-xl',
                formButtonPrimary: 'bg-[#b4532a] hover:bg-[#9c421e] text-sm',
                footerActionLink: 'text-[#b4532a] hover:text-[#9c421e]',
              },
            }}
          />
        )}
      </div>

      {/* Subtle Platform Admin Key Toggle for Self-Hosters */}
      <div className="w-full max-w-[400px] text-center pt-4 border-t border-[#e2dbd1]/60">
        {!showAdminKey ? (
          <button
            type="button"
            onClick={() => setShowAdminKey(true)}
            className="text-xs text-[#71717a] hover:text-[#18181b] underline transition-colors"
          >
            Self-hosting? Sign in with Master Key (rg_admin_…)
          </button>
        ) : (
          <div className="mt-4 text-left">
            <AdminKeyForm navigate={navigate} />
          </div>
        )}
      </div>
    </div>
  );
}

function AdminKeyForm({
  navigate,
  clerkError,
}: {
  navigate: (path: string) => void;
  clerkError?: string;
}) {
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setError('Please enter your admin key.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      localStorage.setItem('relay_admin_key', adminKey.trim());

      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey.trim() }),
      });

      if (res.ok || res.redirected) {
        navigate('/dashboard');
      } else {
        setError('Invalid admin key. Please check and try again.');
      }
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {clerkError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5 shadow-sm">
          <div className="font-semibold flex items-center gap-1.5 text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Clerk Custom Domain DNS Setup Pending</span>
          </div>
          <p className="text-[#6e6459] leading-relaxed">
            <code>clerk.arifcodes.com</code> has not been created in your DNS provider yet.
            To complete Clerk production setup, add the CNAME record for <strong>clerk</strong> in your domain DNS, or switch to your Clerk development key (<code>pk_test_...</code>).
          </p>
          <p className="font-medium text-[#b4532a] pt-0.5">
            You can sign in below with your Platform Master Key.
          </p>
        </div>
      )}

      <Card className="bg-white border-[#e2dbd1] shadow-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-[#b4532a]" />
              <CardTitle className="text-base font-semibold text-[#18181b]">Platform Master Key</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#71717a]">
              Enter your platform administrative key (rg_admin_...) to access the master console.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <Input
                type="password"
                placeholder="rg_admin_..."
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="font-mono text-sm border-[#cfc6b9] focus:border-[#b4532a] focus:ring-[#b4532a]"
                autoFocus
                required
              />
            </div>
          </CardContent>
          <CardFooter className="pt-2 border-t border-[#f4efeb]">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#18181b] hover:bg-[#3f3e3a] text-white font-medium text-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating…' : 'Sign in to Master Console'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
export default LoginPage;
