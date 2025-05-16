
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, ListTodo, UserRound, Menu } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, profile } = useAuth();
  
  // Navigation items for the sidebar
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Tasks",
      href: "/tasks",
      icon: ListTodo,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: UserRound,
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center p-2">
              <img src="/logo/logo.png" alt="Cleanify Logo" className="h-6 w-6 mr-2" />
              <span className="font-semibold text-lg">Cleanify</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.href}
                    tooltip={item.name}
                  >
                    <Link to={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-2">
            <div className="text-sm text-sidebar-foreground">
              <span>Logged in as</span>
              <div className="font-semibold">
                {profile ? profile.username : user?.email}
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <SidebarTrigger />
            <div className="w-full flex-1">
              <h1 className="text-lg font-semibold">
                {navigationItems.find(
                  (item) => item.href === location.pathname
                )?.name || "Cleanify"}
              </h1>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
