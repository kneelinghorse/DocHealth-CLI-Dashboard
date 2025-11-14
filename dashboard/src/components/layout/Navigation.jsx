import { NavLink } from 'react-router-dom'
import { useNavLinks } from '../../hooks/useNavLinks.js'

const Navigation = () => {
  const links = useNavLinks()

  return (
    <nav className="primary-nav" aria-label="Primary">
      <div className="primary-nav__logo">
        <span className="primary-nav__mark" aria-hidden="true">
          DH
        </span>
        <div>
          <p className="eyebrow">DocHealth</p>
          <strong>Dashboard</strong>
        </div>
      </div>
      <div className="primary-nav__links">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              ['primary-nav__link', isActive && 'primary-nav__link--active']
                .filter(Boolean)
                .join(' ')
            }
          >
            <span className="primary-nav__label">{link.label}</span>
            <span className="primary-nav__description">{link.description}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default Navigation
