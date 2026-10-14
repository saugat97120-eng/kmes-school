import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  Image,
  Award,
  Building2,
  Activity,
  Mail,
  Settings,
  FileText,
  LogOut,
  ExternalLink,
  Images,
  Users,
  ScrollText,
  Trash2,
  ChevronDown,
  Menu,
  X,
  Inbox,
  Share2,
} from "lucide-react";
import { clearSession, getUser, hasPermission, refreshSession } from "./api";
import { PERMISSIONS } from "./permissions";

const groups = [
  {
    label: null,
    links: [
      {
        to: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        end: true,
        permission: PERMISSIONS.DASHBOARD_VIEW,
      },
    ],
  },
  {
    label: "Website",
    links: [
      { to: "/admin/pages", label: "Pages", icon: FileText, permission: PERMISSIONS.PAGES_VIEW },
      { to: "/admin/leadership", label: "Leadership", icon: Users, permission: PERMISSIONS.SETTINGS_VIEW },
      { to: "/admin/site-settings", label: "Site Settings", icon: Settings, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
  {
    label: "Content",
    links: [
      { to: "/admin/inbox", label: "Content Inbox", icon: Inbox, permission: PERMISSIONS.CONTENT_VIEW },
      { to: "/admin/notices", label: "Notices", icon: Megaphone, permission: PERMISSIONS.CONTENT_VIEW },
      { to: "/admin/events", label: "Events", icon: CalendarDays, permission: PERMISSIONS.CONTENT_VIEW },
      { to: "/admin/activities", label: "Activities", icon: Activity, permission: PERMISSIONS.CONTENT_VIEW },
      { to: "/admin/achievements", label: "Achievements", icon: Award, permission: PERMISSIONS.CONTENT_VIEW },
      { to: "/admin/facilities", label: "Facilities", icon: Building2, permission: PERMISSIONS.CONTENT_VIEW },
      { to: "/admin/gallery", label: "Gallery", icon: Image, permission: PERMISSIONS.CONTENT_VIEW },
      { to: "/admin/review", label: "Review Queue", icon: Inbox, permission: PERMISSIONS.CONTENT_REVIEW },
    ],
  },
  {
    label: "Communications",
    links: [{ to: "/admin/messages", label: "Contact Messages", icon: Mail, permission: PERMISSIONS.MESSAGES_VIEW }],
  },
  {
    label: "Integrations",
    links: [
      { to: "/admin/integrations/facebook", label: "Facebook", icon: Share2, permission: PERMISSIONS.SOCIAL_VIEW },
    ],
  },
  {
    label: "Media",
    links: [{ to: "/admin/media", label: "Media Library", icon: Images, permission: PERMISSIONS.MEDIA_VIEW }],
  },
  {
    label: "System",
    links: [
      { to: "/admin/users", label: "Users & Access", icon: Users, permission: PERMISSIONS.USERS_VIEW },
      { to: "/admin/trash", label: "Trash", icon: Trash2, permission: PERMISSIONS.TRASH_VIEW },
      { to: "/admin/activity-logs", label: "Activity Logs", icon: ScrollText, permission: PERMISSIONS.ACTIVITY_LOGS_VIEW },
    ],
  },
];

const canView = (link) => !link.permission || hasPermission(link.permission);

function NavGroup({ group, onNavigate }) {
  const [open, setOpen] = useState(true);
  const links = group.links.filter(canView);
  if (!links.length) return null;

  if (!group.label) {
    return (
      <div className="space-y-1">
        {links.map((link) => (
          <NavItem key={link.to} link={link} onNavigate={onNavigate} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600"
      >
        {group.label}
        <ChevronDown size={13} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="space-y-1">
          {links.map((link) => (
            <NavItem key={link.to} link={link} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavItem({ link, onNavigate }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
          isActive ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-100"
        }`
      }
    >
      <link.icon size={17} />
      {link.label}
    </NavLink>
  );
}

function SidebarContent({ onNavigate, onLogout }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy font-serif text-sm font-bold text-gold">
          K
        </div>
        <span className="font-serif text-base font-bold text-navy">KMES Admin</span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-5">
        {groups.map((group, i) => (
          <NavGroup key={group.label || i} group={group} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100"
        >
          <ExternalLink size={14} /> View Live Site
        </a>
        <button
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </>
  );
}

function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();

  // Sync the local permission snapshot with the authoritative backend on mount
  // so role/permission changes take effect without forcing a re-login.
  useEffect(() => {
    refreshSession();
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-bg-light">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <SidebarContent onLogout={handleLogout} />
      </aside>

      {/* Mobile / tablet navigation drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex items-center gap-2 rounded-lg p-1 text-navy hover:bg-gray-100"
          >
            <Menu size={20} />
            <span className="font-serif text-base font-bold">KMES Admin</span>
          </button>
          <button onClick={handleLogout} className="text-xs font-semibold text-red-600">
            Logout
          </button>
        </header>

        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 text-sm text-gray-500">
          <span>
            Signed in as <span className="font-semibold text-navy">{user?.name || user?.email}</span>
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              user?.role === "admin" ? "bg-navy/10 text-navy" : "bg-gray-100 text-gray-500"
            }`}
          >
            {user?.role === "admin" ? "Administrator" : "Editor"}
          </span>
        </div>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;