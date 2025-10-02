import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial scroll position

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <nav className="navbar-container">
        <div className="navbar-left">
          {/* Logo */}
          <Link
            to="/"
            className="logo"
          >
            <span className="logo-icon">P</span>
            <span>PeelPack</span>
          </Link>

          {/* Navigation Links */}
          <div className="nav-links">
            <Link
              to="/"
              className="nav-link"
              activeProps={{
                className: 'nav-link active',
              }}
            >
              创建
            </Link>
            <Link
              to="/projects"
              className="nav-link"
              activeProps={{
                className: 'nav-link active',
              }}
            >
              我的项目
            </Link>
          </div>
        </div>

        {/* Right section - placeholder for future features */}
        <div className="navbar-right">
          {/* Future: User avatar, settings, etc. */}
        </div>
      </nav>
    </header>
  )
}
