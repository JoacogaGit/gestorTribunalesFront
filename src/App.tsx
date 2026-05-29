import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthScreen from "./components/AuthScreen";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvitation from "./pages/AcceptInvitation";
import SuperadminPanel from "./pages/SuperadminPanel";
import SuperadminTribunalDetail from "./pages/SuperadminTribunalDetail";
import { VocaliaProvider } from "@/context/VocaliaContext";
import { AuthProvider } from "@/context/AuthContext";
import { SuperadminModeProvider } from "@/context/SuperadminModeContext";

const queryClient = new QueryClient();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 1000 * 60 * 5,
    },
  },
});
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <VocaliaProvider>
          <AuthProvider>
            <SuperadminModeProvider>
              <Routes>
                <Route path="/auth" element={<AuthScreen />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/invitacion/:token" element={<AcceptInvitation />} />
                <Route path="/superadmin" element={<SuperadminPanel />} />
                <Route path="/superadmin/tribunal/:id" element={<SuperadminTribunalDetail />} />
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SuperadminModeProvider>
          </AuthProvider>
        </VocaliaProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
