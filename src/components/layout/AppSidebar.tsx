
import { Monitor, BarChart3, Image, Settings, Grid2x2, Database, Camera } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: Grid2x2,
  },
  {
    title: "Dispositivos",
    url: "/admin/devices",
    icon: Monitor,
  },
  {
    title: "Mídias",
    url: "/admin/media",
    icon: Image,
  },
  {
    title: "Câmera",
    url: "/admin/camera",
    icon: Camera,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Configurações",
    url: "/admin/settings",
    icon: Settings,
  },
];

const AppSidebar = () => {
  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              SignageAI
            </h1>
            <p className="text-xs text-muted-foreground">Digital Signage Pro</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 py-2">
            GERENCIAMENTO
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
