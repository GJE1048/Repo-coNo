import { NavLink, useNavigate } from "react-router-dom"
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Mic,
  Command,
  ScrollText
} from "lucide-react"
import { cn } from "../../lib/utils"
import { useAuth } from "../../lib/auth"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "dashboard" },
  { icon: Users, label: "Users", href: "users" },
  { icon: FileText, label: "Documents", href: "documents" },
  { icon: Mic, label: "AI Shorthand", href: "ai-shorthand" },
  { icon: ScrollText, label: "Logs", href: "logs" },
  { icon: Settings, label: "Settings", href: "settings" },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Command className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="leading-none">CoNotion</span>
            <span className="text-[10px] text-muted-foreground font-normal">Admin Panel</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  isActive
                    ? "bg-muted text-primary"
                    : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
