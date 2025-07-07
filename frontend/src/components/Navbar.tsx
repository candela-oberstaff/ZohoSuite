import { Link, useLocation } from 'react-router-dom'

const Navbar = () => {
  const location = useLocation()

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Dashboard Zoho Bigin
          </h1>
          <div className="flex space-x-4">
            <Link
              to="/contacts"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/contacts'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 hover:bg-green-500 hover:text-white'
              }`}
            >
              Contactos
            </Link>
            <Link
              to="/opportunities"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === '/opportunities'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 hover:bg-green-500 hover:text-white'
              }`}
            >
              Oportunidades
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
