import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AIAssistant } from "@/components/AIAssistant";
import Index from "./pages/Index";
import MapView from "./pages/MapView";
import AddStore from "./pages/AddStore";
import StoreDetail from "./pages/StoreDetail";
import ProductSearch from "./pages/ProductSearch";
import AboutUs from "./pages/AboutUs";
import EditAbout from "./pages/EditAbout";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import OwnerAdmin from "./pages/OwnerAdmin";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import "./i18n/config";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/add-store" element={<AddStore />} />
            <Route path="/store/:id" element={<StoreDetail />} />
            <Route path="/search" element={<ProductSearch />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/edit-about" element={<EditAbout />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/owner-admin" element={<OwnerAdmin />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/chat/:storeId" element={<Chat />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIAssistant />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
