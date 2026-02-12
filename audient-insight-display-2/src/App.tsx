import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/hooks/useTheme";
import AppLayout from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Media from "./pages/Media";
import Analytics from "./pages/Analytics";
import InkyIntelligence from "./pages/admin/InkyIntelligence";
import Settings from "./pages/Settings";
import Index from "./pages/Index";
import DevicePlayer from "./pages/DevicePlayer";
// import DeviceSetup from "./pages/DeviceSetup";
import { DeviceOnboarding } from "@/modules/device-registration";
import DeviceDetector from "./pages/DeviceDetector";
import OfflinePlayer from "./pages/OfflinePlayer";
import WebViewPlayer from "./pages/WebViewPlayer";
import Camera from "./pages/Camera";
import CameraFullscreen from "./pages/CameraFullscreen";
import LiveMonitoring from "./pages/LiveMonitoring";
import DeviceDemo from "./pages/DeviceDemo";
import MobileDemo from "./pages/MobileDemo";
import Auth from "./pages/Auth";
import CanvaCallback from "./pages/admin/CanvaCallback";
import Stores from "./pages/admin/Stores";
import StoresMap from "./pages/admin/StoresMap";
import Regions from "./pages/admin/Regions";
import Channels from "./pages/admin/Channels";
import Playlists from "./pages/admin/Playlists";
import PlaylistEditorPage from "./pages/admin/PlaylistEditor";
import DeviceGroups from "./pages/admin/DeviceGroups";
import Tenants from "./pages/admin/Tenants";
import Companies from "./pages/admin/Companies";
import ProductDisplayConfig from "./pages/admin/ProductDisplayConfig";
import ProductAnalytics from "./pages/admin/ProductAnalytics";
import CanvaIntegration from "./pages/admin/CanvaIntegration";
import CanvaEditor from "./pages/admin/CanvaEditor";
import Install from "./pages/Install";
import Presentation from "./pages/Presentation";
import AssaiPresentation from "./pages/AssaiPresentation";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { PWAUpdatePrompt, InstallPrompt } from "./components/PWAPrompts";
import { useSyncManager } from "./hooks/useSyncManager";
import { Capacitor } from '@capacitor/core';
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if ((error as Error)?.message?.includes('4')) return false;
        return failureCount < 3;
      },
    },
  },
});

// Componente para gerenciar redirecionamento inicial em apps nativos (Android)
const NativeRouteHandler = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Só executa se for plataforma nativa (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      const savedDeviceCode = localStorage.getItem("mupa_device_code");
      const path = window.location.pathname;
      
      console.log("[NativeRouteHandler] Checking route...", { path, savedDeviceCode });

      // Evita loops se já estiver nas rotas corretas
      if (path.includes("/android-player") || path.includes("/device-setup") || path.includes("/setup")) {
        return;
      }

      if (savedDeviceCode) {
        console.log("[NativeRouteHandler] Redirecting to Player");
        navigate(`/android-player?device_id=${savedDeviceCode}`, { replace: true });
      } else {
        console.log("[NativeRouteHandler] Redirecting to Setup");
        navigate("/device-setup", { replace: true });
      }
    }
  }, [navigate]);

  return null;
};

function AppContent() {
  // Initialize sync manager at app level
  useSyncManager();

  return (
    <>
      <PWAUpdatePrompt />
      <InstallPrompt />
      <OfflineIndicator />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NativeRouteHandler />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/install" element={<Install />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/device/:deviceId" element={<DevicePlayer />} />
          <Route path="/setup/:deviceId" element={<DeviceOnboarding />} />
          <Route path="/device-setup" element={<DeviceOnboarding />} />
          <Route path="/detect/:deviceCode" element={<DeviceDetector />} />
          <Route path="/play/:deviceCode" element={<WebViewPlayer />} />
          <Route path="/webview/:deviceCode" element={<WebViewPlayer />} />
          {/* Rota específica para Android/Kodular usando query param ?device_id=XYZ */}
          <Route path="/android-player" element={<WebViewPlayer />} />
          <Route path="/camera" element={<Camera />} />
          <Route path="/camera-fullscreen" element={<CameraFullscreen />} />
          <Route path="/demo" element={<DeviceDemo />} />
          <Route path="/apresentacao" element={<Presentation />} />
          <Route path="/apresentacao-assai" element={<AssaiPresentation />} />
          <Route path="/mobile-demo" element={<MobileDemo />} />
          {/* Canva OAuth callback - must be outside ProtectedRoute to handle redirect properly */}
          <Route path="/admin/canva/callback" element={<CanvaCallback />} />
          
          {/* Fullscreen Map Route - No Layout/Sidebar */}
          <Route
            path="/admin/stores/map"
            element={
              <ProtectedRoute>
                <StoresMap />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full bg-transparent">
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
                        <Route path="inky-intelligence" element={<InkyIntelligence />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="camera" element={<Camera />} />
                        <Route path="monitoring" element={<LiveMonitoring />} />
                        <Route path="tenants" element={<Tenants />} />
                        <Route path="companies" element={<Companies />} />
                        <Route path="companies/:companyId/display-config" element={<ProductDisplayConfig />} />
                        <Route path="product-analytics" element={<ProductAnalytics />} />
                        <Route path="canva" element={<CanvaIntegration />} />
                        <Route path="integrations/canva/editor" element={<CanvaEditor />} />
                      </Routes>
                    </AppLayout>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <ThemeProvider defaultTheme="dark">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
