import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex gap-6">
        <Link
          to="/"
          className="text-gray-700 hover:text-primary font-medium transition-colors"
          activeProps={{
            className: 'text-primary',
          }}
        >
          创建
        </Link>
        <Link
          to="/projects"
          className="text-gray-700 hover:text-primary font-medium transition-colors"
          activeProps={{
            className: 'text-primary',
          }}
        >
          我的项目
        </Link>
      </nav>
    </header>
  )
}
