import React from 'react';

export function Footer({ navigate }: { navigate: (path: string) => void }) {
  return (
    <footer className="w-full bg-[#f4efeb] border-t border-[#e2dbd1] py-14">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#e2dbd1]">
          {/* Brand Col */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <img src="/assets/logo.png" alt="Relay Gateway" className="h-6 w-auto mix-blend-multiply" />
              <span className="font-serif font-medium text-lg text-[#18181b]">
                Relay<span className="text-[#b4532a] ml-1 font-normal">Gateway</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#52525b] max-w-sm leading-relaxed">
              Multi-tenant Telegram bot infrastructure and MTProto gateway built for developers and fast-moving SaaS teams.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 font-mono text-[11px] bg-white border border-[#e2dbd1] text-[#52525b] rounded">
                AGPL-3.0 LICENSED
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#71717a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3f6b4a] inline-block" />
                Self-Host Permitted
              </span>
            </div>
          </div>

          {/* Nav Cols */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-xs text-[#71717a] uppercase tracking-wider font-medium">Developer</span>
              <a
                href="/docs"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/docs');
                }}
                className="text-xs text-[#52525b] hover:text-[#18181b] transition-colors"
              >
                API Reference
              </a>
              <a
                href="/docs"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/docs');
                }}
                className="text-xs text-[#52525b] hover:text-[#18181b] transition-colors"
              >
                Webhook Specs
              </a>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-xs text-[#71717a] uppercase tracking-wider font-medium">Platform</span>
              <a
                href="/pricing"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/pricing');
                }}
                className="text-xs text-[#52525b] hover:text-[#18181b] transition-colors"
              >
                Pricing Plans
              </a>
              <a
                href="/dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  const hasKey = typeof window !== 'undefined' ? Boolean(localStorage.getItem('relay_admin_key')) : false;
                  navigate(hasKey ? '/dashboard' : '/login');
                }}
                className="text-xs text-[#52525b] hover:text-[#18181b] transition-colors"
              >
                Console Overview
              </a>
              <a
                href="/healthz"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#52525b] hover:text-[#18181b] transition-colors"
              >
                Health Status
              </a>
            </div>

            <div className="flex flex-col gap-2.5 col-span-2 sm:col-span-1">
              <span className="font-mono text-xs text-[#71717a] uppercase tracking-wider font-medium">Open Source</span>
              <a
                href="/open-source"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/open-source');
                }}
                className="text-xs text-[#52525b] hover:text-[#18181b] transition-colors font-medium"
              >
                Self-Hosting Guide
              </a>
              <a
                href="https://github.com/arif-js/relay-gateway"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#52525b] hover:text-[#18181b] transition-colors"
              >
                GitHub Repository
              </a>
              <a
                href="https://github.com/arif-js/relay-gateway/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#52525b] hover:text-[#18181b] transition-colors"
              >
                AGPL-3.0 License
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#71717a]">
          <div>AGPL-3.0 · self-host it, or let us run it. Free for now.</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3f6b4a] inline-block" />
            <span>All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default Footer;
