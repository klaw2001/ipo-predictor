import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-slate-800 mt-16 py-8 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-500">
          {/* Brand */}
          <div>
            <p className="text-slate-300 font-semibold mb-2">IPOPredictor</p>
            <p>Free, public IPO intelligence platform for Indian markets. No signup required.</p>
          </div>

          {/* Links */}
          <div>
            <p className="text-slate-400 font-medium mb-2">Pages</p>
            <div className="space-y-1">
              <Link href="/ipos" className="block hover:text-slate-300 transition-colors">All IPOs</Link>
              <Link href="/performance" className="block hover:text-slate-300 transition-colors">Model Performance</Link>
              <Link href="/about" className="block hover:text-slate-300 transition-colors">About & Methodology</Link>
            </div>
          </div>

          {/* Data sources */}
          <div>
            <p className="text-slate-400 font-medium mb-2">Data Sources</p>
            <p className="mb-1">Subscription: NSE India, BSE India</p>
            <p className="mb-1">IPO data: Chittorgarh.com</p>
            <p className="text-orange-400/70">GMP: Investorgain.com (unofficial, not regulated)</p>
          </div>
        </div>

        {/* Disclaimers */}
        <div className="mt-6 pt-6 border-t border-slate-800/50 space-y-2 text-[11px] text-slate-600 leading-relaxed">
          <p>
            <span className="text-amber-500/80 font-medium">SEBI Disclaimer: </span>
            IPOPredictor is an AI-based educational tool and does NOT constitute investment advice.
            We are not registered with SEBI as an investment advisor. Past IPO performance does not guarantee future results.
            All AI predictions are for informational purposes only. Please consult a SEBI-registered advisor before investing.
          </p>
          <p>
            <span className="text-slate-500 font-medium">GMP Disclaimer: </span>
            Grey Market Premium (GMP) data is sourced from unofficial, unregulated grey markets. It is not verified or endorsed by any exchange or regulator.
          </p>
          <p>© {new Date().getFullYear()} IPOPredictor. All data is for informational purposes only.</p>
        </div>
      </div>
    </footer>
  )
}
