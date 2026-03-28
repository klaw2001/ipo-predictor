import Link from 'next/link'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Home' },
  { href: '/ipos', label: 'All IPOs' },
  { href: '/performance', label: 'Performance' },
  { href: '/about', label: 'About' },
]

export function Navbar() {
  return (
    <nav className="bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center">
            <span className="text-slate-950 font-black text-sm leading-none">IP</span>
          </div>
          <span className="text-slate-100 font-bold text-lg tracking-tight">
            IPO<span className="text-emerald-400">Predictor</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
