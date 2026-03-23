import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppModeProvider } from "@/contexts/AppModeContext";
import AppLayout from "@/components/layout/AppLayout";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Transactions from "@/pages/Transactions";
import Accounts from "@/pages/Accounts";
import CreditCards from "@/pages/CreditCards";
import Budgets from "@/pages/Budgets";
import Goals from "@/pages/Goals";
import Reports from "@/pages/Reports";
import Categories from "@/pages/Categories";
import NotFound from "@/pages/NotFound";
import BusinessDashboard from "@/pages/BusinessDashboard";
import BusinessExpenses from "@/pages/BusinessExpenses";
import BusinessSales from "@/pages/BusinessSales";
import BusinessProducts from "@/pages/BusinessProducts";
import FoodPricing from "@/pages/FoodPricing";
import CoupleDashboard from "@/pages/CoupleDashboard";
import CoupleTransactions from "@/pages/CoupleTransactions";
import CoupleInvite from "@/pages/CoupleInvite";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AuthRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AppModeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <PWAUpdatePrompt />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthRoute />} />
                <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Index />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="accounts" element={<Accounts />} />
                  <Route path="credit-cards" element={<CreditCards />} />
                  <Route path="budgets" element={<Budgets />} />
                  <Route path="goals" element={<Goals />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="business" element={<BusinessDashboard />} />
                  <Route path="business/expenses" element={<BusinessExpenses />} />
                  <Route path="business/sales" element={<BusinessSales />} />
                  <Route path="business/products" element={<BusinessProducts />} />
                  <Route path="business/food-pricing" element={<FoodPricing />} />
                  <Route path="couple" element={<CoupleDashboard />} />
                  <Route path="couple/transactions" element={<CoupleTransactions />} />
                  <Route path="couple/invite" element={<CoupleInvite />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppModeProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
