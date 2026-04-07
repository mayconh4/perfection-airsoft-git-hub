import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { ProductPage } from './pages/ProductPage';
import { LoginPage } from './pages/LoginPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { SearchPage } from './pages/SearchPage';
import { DashboardPage } from './pages/DashboardPage';
import { WishlistPage } from './pages/WishlistPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ShippingPage } from './pages/ShippingPage';
import { WarrantyPage } from './pages/WarrantyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import FAQPage from './pages/FAQPage';
import { ContactPage } from './pages/ContactPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { BrandsPage } from './pages/BrandsPage';
import { MapsPage } from './pages/MapsPage';
import { ArmariaPage } from './pages/ArmariaPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import CreateEventPage from './pages/CreateEventPage';
import DropPage from './pages/DropPage';
import RaffleDetailPage from './pages/RaffleDetailPage';
import CreateRafflePage from './pages/CreateRafflePage';
import OrganizerDashboard from './pages/OrganizerDashboard';
import SecurityNoticePage from './pages/SecurityNoticePage';
import DashboardDemo from './pages/DashboardDemo';
import AuthCallbackPage from './pages/AuthCallbackPage';
import MyTicketsPage from './pages/MyTicketsPage';
import EventCheckInPage from './pages/EventCheckInPage';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminMessages } from './pages/admin/AdminMessages';
import AdminModeration from './pages/AdminModeration';
import FinanceDashboard from './pages/FinanceDashboard';
import { CreateClassPage } from './pages/CreateClassPage';
import BlogListingPage from './pages/BlogListingPage';
import BlogDetailPage from './pages/BlogDetailPage';

import { PricingProvider } from './context/PricingContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <PricingProvider>
            <CartProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/marcas" element={<BrandsPage />} />
                  <Route path="/mapas" element={<MapsPage />} />
                  <Route path="/categoria/:slug" element={<CategoryPage />} />
                  <Route path="/produto/:idOrSlug" element={<ProductPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/carrinho" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/sucesso/:id" element={<OrderSuccessPage />} />
                  <Route path="/busca" element={<SearchPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/meus-ingressos" element={<MyTicketsPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/privacidade" element={<PrivacyPage />} />
                  <Route path="/envios" element={<ShippingPage />} />
                  <Route path="/garantia" element={<WarrantyPage />} />
                  <Route path="/termos" element={<TermsOfServicePage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/contato" element={<ContactPage />} />
                  <Route path="/armaria" element={<ArmariaPage />} />
                  <Route path="/eventos" element={<EventsPage />} />
                  <Route path="/eventos/criar" element={<CreateEventPage />} />
                  <Route path="/eventos/:id" element={<EventDetailPage />} />
                  <Route path="/qg/:id" element={<EventCheckInPage />} />
                  <Route path="/drop" element={<DropPage />} />
                  <Route path="/drop/criar" element={<CreateRafflePage />} />
                  <Route path="/drop/editar/:id" element={<CreateRafflePage />} />
                  <Route path="/drop/:idOrSlug" element={<RaffleDetailPage />} />
                  <Route path="/seguranca-comunidade" element={<SecurityNoticePage />} />
                  <Route path="/organizador" element={<OrganizerDashboard />} />
                  <Route path="/organizador/financeiro" element={<FinanceDashboard />} />
                  <Route path="/painel-de-elite" element={<OrganizerDashboard />} />
                  <Route path="/dashboard-demo" element={<DashboardDemo />} />
                  <Route path="/organizador/eventos/:id" element={<CreateEventPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/create-class" element={<CreateClassPage />} />
                  
                  {/* Blog & Educational */}
                  <Route path="/blog" element={<BlogListingPage />} />
                  <Route path="/blog/modalidades/:slug" element={<BlogDetailPage />} />
                  <Route path="/blog/modos/:slug" element={<BlogDetailPage />} />

                  {/* Admin Area */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="produtos" element={<AdminProducts />} />
                    <Route path="pedidos" element={<AdminOrders />} />
                    <Route path="mensagens" element={<AdminMessages />} />
                    <Route path="moderacao" element={<AdminModeration />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </CartProvider>
          </PricingProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
