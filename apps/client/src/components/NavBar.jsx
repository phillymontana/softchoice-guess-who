import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Info } from 'lucide-react';

const NavBar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Gallery', icon: Home },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-black drop-shadow-lg group-hover:scale-110 transition-transform">
            ?
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block">GUESS WHO</span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${location.pathname === path
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}

          {/* <button
            onClick={() => {
              if (confirm('Clear your local voting history? This cannot be undone.')) {
                localStorage.removeItem('voted_images');
                window.location.reload();
              }
            }}
            className="p-2 ml-2 rounded-full text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all focus:outline-none"
            title="Reset Local Progress"
          >
            <Info size={16} />
          </button> */}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
