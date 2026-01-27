import { Bell, Search } from "lucide-react"
import { Input } from "../ui/input"
import { Sidebar } from "./Sidebar"
import { Outlet } from "react-router-dom"
import { useAuth } from "../../lib/auth"

export function MainLayout() {
  const { username } = useAuth()
  const displayName = username ?? "管理员"
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen w-full bg-muted/20">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex flex-1 items-center gap-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tickets..." 
              className="w-[300px] border-none bg-transparent shadow-none focus-visible:ring-0 pl-0"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 hover:bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-3 border-l pl-4">
              <div className="flex flex-col items-end text-sm">
                <span className="font-semibold">{displayName}</span>
                <span className="text-xs text-muted-foreground">Administrator</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                {initials}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
