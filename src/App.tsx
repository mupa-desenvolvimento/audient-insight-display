import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/hooks/useTheme";
import AppLayout from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Media from "./pages/Media";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Player from "./pages/Player";
import Index from "./pages/Index";
import DevicePlayer from "./pages/DevicePlayer";
import DeviceDetector from "./pages/DeviceDetector";
import Camera from "./pages/Camera";
import CameraFullscreen from "./pages/CameraFullscreen";
import LiveMonitoring from "./pages/LiveMonitoring";
import Auth from "./pages/Auth";
import Stores from "./pages/admin/Stores";
import Regions from "./pages/admin/Regions";
import Channels from "./pages/admin/Channels";
import Playlists from "./pages/admin/Playlists";
import PlaylistEditorPage from "./pages/admin/PlaylistEditor";
import DeviceGroups from "./pages/admin/DeviceGroups";
import Tenants from "./pages/admin/Tenants";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="dark">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/player" element={<Player />} />
            <Route path="/device/:deviceId" element={<DevicePlayer />} />
            <Route path="/detect/:deviceCode" element={<DeviceDetector />} />
            <Route path="/camera" element={<Camera />} />
            <Route path="/camera-fullscreen" element={<CameraFullscreen />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full bg-background">
                      <AppLayout>
                        <Routes>
                          <Route path="dashboard" element={<Dashboard />} />
                          <Route path="devices" element={<Devices />} />
                          <Route path="device-groups" element={<DeviceGroups />} />
                          <Route path="stores" element={<Stores />} />
                          <Route path="regions" element={<Regions />} />
                          <Route path="channels" element={<Channels />} />
                          <Route path="playlists" element={<Playlists />} />
                          <Route path="playlists/:id/edit" element={<PlaylistEditorPage />} />
                          <Route path="playlists/new" element={<PlaylistEditorPage />} />
                          <Route path="media" element={<Media />} />
                          <Route path="analytics" element={<Analytics />} />
                          <Route path="settings" element={<Settings />} />
                          <Route path="camera" element={<Camera />} />
                          <Route path="monitoring" element={<LiveMonitoring />} />
                          <Route path="tenants" element={<Tenants />} />
                        </Routes>
                      </AppLayout>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
