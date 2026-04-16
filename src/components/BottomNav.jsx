import { NavLink } from 'react-router-dom'
import { Package, ShoppingBag, TrendingUp, Users } from 'lucide-react'

const tabs = [
  { to: '/',            icon: Package,     label: 'Produtos'    },
  { to: '/vender',      icon: ShoppingBag, label: 'Vender'      },
  { to: '/faturamento', icon: TrendingUp,  label: 'Faturamento' },
  { to: '/clientes',    icon: Users,       label: 'Clientes'    },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-bottom">
      <div className="max-w-4xl mx-auto flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-semibold transition-colors ${
                isActive ? 'text-rose-500' : 'text-gray-400 hover:text-gray-600'
              }`
            }>
            {({ isActive }) => (
              <>
                <span className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-rose-50' : ''}`}>
                  <Icon className="w-5 h-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
