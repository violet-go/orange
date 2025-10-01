import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all">
              <span className="text-white text-lg font-bold">🎨</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              PeelPack
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="px-4 py-2 rounded-lg text-gray-700 hover:text-violet-600 hover:bg-violet-50/50 font-medium transition-all"
              activeProps={{
                className: 'text-violet-600 bg-violet-50',
              }}
            >
              <span className="flex items-center gap-2">
                <span>✨</span>
                <span>创建</span>
              </span>
            </Link>
            <Link
              to="/projects"
              className="px-4 py-2 rounded-lg text-gray-700 hover:text-violet-600 hover:bg-violet-50/50 font-medium transition-all"
              activeProps={{
                className: 'text-violet-600 bg-violet-50',
              }}
            >
              <span className="flex items-center gap-2">
                <span>📁</span>
                <span>我的项目</span>
              </span>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
