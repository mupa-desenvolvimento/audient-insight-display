import {
  Monitor,
  BarChart3,
  Image,
  Settings,
  Grid2x2,
  Camera,
  Eye,
  Store,
  MapPin,
  LogOut,
  Tv,
  ListVideo,
  Layers,
  Building2,
  Plug2,
  Palette,
} from "lucide-react";
import logoHorizontal from "@/assets/logo_horizontal.svg";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useUserCompany } from "@/hooks/useUserCompany";
import { Button } from "@/components/ui/button";
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
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: Grid2x2 },
  { title: "Lojas", url: "/admin/stores", icon: Store },
  { title: "Regiões", url: "/admin/regions", icon: MapPin },
  { title: "Dispositivos", url: "/admin/devices", icon: Monitor },
  { title: "Grupos", url: "/admin/device-groups", icon: Layers },
  { title: "Canais", url: "/admin/channels", icon: Tv },
  { title: "Playlists", url: "/admin/playlists", icon: ListVideo },
  { title: "Galeria", url: "/admin/media", icon: Image },
  { title: "Câmera", url: "/admin/camera", icon: Camera },
  { title: "Monitoramento", url: "/admin/monitoring", icon: Eye },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

const superAdminItems = [
  { title: "Clientes", url: "/admin/tenants", icon: Building2 },
  { title: "Empresas", url: "/admin/companies", icon: Plug2 },
];

const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const { company } = useUserCompany();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center">
          <img src={logoHorizontal} alt="MupaMídias" className="h-10" />
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
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

        {/* Tenant Admin Section - Display Config */}
        {company && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 py-2">
              CONFIGURAÇÕES DA EMPRESA
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={`/admin/companies/${company.id}/display-config`}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <Palette className="w-4 h-4" />
                      <span className="font-medium">Tela de Consulta</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 py-2">
              SUPER ADMIN
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="text-sm truncate">
            <p className="font-medium truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
