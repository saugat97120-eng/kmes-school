import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";

const navLinks = [
  { label: "Home", to: "/" },
  {
    label: "About",
    to: "/about",
    children: [{ label: "About School", to: "/about" }],
  },
  {
    label: "Academics",
    to: "/academics",
    children: [{ label: "Academic Programs", to: "/academics" }],
  },
  { label: "Facilities", to: "/facilities" },
  { label: "Activities", to: "/activities" },
  { label: "Notices", to: "/notices" },
  { label: "Events", to: "/events" },
  { label: "Gallery", to: "/gallery" },
  { label: "Achievements", to: "/achievements" },
  { label: "Admissions", to: "/admissions" },
];

function Navbar() {
  const { settings } = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSubOpen, setMobileSubOpen] = useState(null);

  const linkClass = ({ isActive }) =>
    `text-sm font-semibold transition ${
      isActive ? "text-gold" : "text-navy hover:text-gold"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.shortName || settings.schoolName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-serif text-lg font-bold text-gold">
              {(settings.shortName || "K").slice(0, 1)}
            </div>
          )}
          <span className="font-serif text-lg font-bold text-navy">
            {settings.shortName || "KMES"}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.to} className="group relative">
                <button className="flex items-center gap-1 text-sm font-semibold text-navy hover:text-gold">
                  {link.label} <ChevronDown size={14} />
                </button>
                <div className="invisible absolute left-0 top-full z-50 w-52 rounded-lg border border-gray-200 bg-white py-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                  {link.children.map((child) => (
                    <Link
                      key={child.to}
                      to={child.to}
                      className="block px-4 py-2 text-sm text-navy hover:bg-gray-50 hover:text-gold"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <Link
          to="/contact"
          className="hidden rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-2 lg:inline-flex"
        >
          Contact
        </Link>

        <button
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={26} className="text-navy" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
            <span className="font-serif text-lg font-bold text-navy">{settings.shortName || "KMES"}</span>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={26} className="text-navy" />
            </button>
          </div>
          <div className="flex flex-col divide-y divide-gray-100">
            {navLinks.map((link) => (
              <div key={link.to}>
                <div className="flex items-center justify-between px-4 py-4">
                  <Link
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="text-base font-semibold text-navy"
                  >
                    {link.label}
                  </Link>
                  {link.children && (
                    <button
                      onClick={() =>
                        setMobileSubOpen(mobileSubOpen === link.to ? null : link.to)
                      }
                    >
                      <ChevronRight
                        size={18}
                        className={`text-gray-400 transition ${
                          mobileSubOpen === link.to ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>
                {link.children && mobileSubOpen === link.to && (
                  <div className="bg-gray-50 px-6 pb-2">
                    {link.children.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 text-sm text-gray-600"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="mx-4 mt-4 rounded-md bg-navy px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
