import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { SiteSettingsProvider } from "./context/SiteSettingsContext";
import { IStudentProvider } from "./context/IStudentContext";
import ScrollToTop from "./components/common/ScrollToTop";
import TopBar from "./components/layout/TopBar";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Loading from "./components/common/Loading";

import Home from "./pages/Home";
import About from "./pages/About";
import Academics from "./pages/Academics";
import Facilities from "./pages/Facilities";
import Activities from "./pages/Activities";
import Notices from "./pages/Notices";
import NoticeDetails from "./pages/NoticeDetails";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Gallery from "./pages/Gallery";
import Achievements from "./pages/Achievements";
import Admissions from "./pages/Admissions";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const AdminLogin = lazy(() => import("./admin/AdminLogin"));
const ResetPassword = lazy(() => import("./admin/ResetPassword"));
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminMessages = lazy(() => import("./admin/AdminMessages"));
const SiteSettingsManager = lazy(() => import("./admin/SiteSettingsManager"));
const LeadershipManager = lazy(() => import("./admin/LeadershipManager"));
const PageContentManager = lazy(() => import("./admin/PageContentManager"));
const ResourceManager = lazy(() => import("./admin/ResourceManager"));
const ReviewQueue = lazy(() => import("./admin/ReviewQueue"));
const Inbox = lazy(() => import("./admin/Inbox"));
const MediaLibrary = lazy(() => import("./admin/MediaLibrary"));
const Trash = lazy(() => import("./admin/Trash"));
const UsersManager = lazy(() => import("./admin/UsersManager"));
const ActivityLogs = lazy(() => import("./admin/ActivityLogs"));
const FacebookIntegration = lazy(() => import("./admin/FacebookIntegration"));

import ProtectedRoute from "./admin/ProtectedRoute";
import PermissionRoute from "./admin/PermissionRoute";
import { PERMISSIONS } from "./admin/permissions";
import { resourceConfigs } from "./admin/resourceConfigs";

import EmergencyAlertBar from "./components/common/EmergencyAlertBar";
import FloatingQuickContact from "./components/common/FloatingQuickContact";

function PublicLayout({ children }) {
  return (
    <>
      <EmergencyAlertBar />
      <TopBar />
      <Navbar />
      {children}
      <Footer />
      <FloatingQuickContact />
    </>
  );
}

function App() {
  return (
    <SiteSettingsProvider>
      <BrowserRouter>
        <IStudentProvider>
          <ScrollToTop />
          <Suspense fallback={<Loading />}>
            <Routes>
          {/* Admin routes: separate layout, no public navbar/footer */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/reset-password" element={<ResetPassword />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route
              path="site-settings"
              element={
                <PermissionRoute permission={PERMISSIONS.SETTINGS_EDIT}>
                  <SiteSettingsManager />
                </PermissionRoute>
              }
            />
            <Route
              path="leadership"
              element={
                <PermissionRoute permission={PERMISSIONS.SETTINGS_EDIT}>
                  <LeadershipManager />
                </PermissionRoute>
              }
            />
            <Route
              path="pages"
              element={
                <PermissionRoute permission={PERMISSIONS.PAGES_EDIT}>
                  <PageContentManager />
                </PermissionRoute>
              }
            />
            <Route
              path="messages"
              element={
                <PermissionRoute permission={PERMISSIONS.MESSAGES_VIEW}>
                  <AdminMessages />
                </PermissionRoute>
              }
            />
            <Route
              path="media"
              element={
                <PermissionRoute permission={PERMISSIONS.MEDIA_VIEW}>
                  <MediaLibrary />
                </PermissionRoute>
              }
            />
            {Object.values(resourceConfigs).map((config) => (
              <Route
                key={config.resource}
                path={config.resource}
                element={
                  <PermissionRoute permission={PERMISSIONS.CONTENT_VIEW}>
                    <ResourceManager key={config.resource} config={config} />
                  </PermissionRoute>
                }
              />
            ))}
            <Route
              path="review"
              element={
                <PermissionRoute permission={PERMISSIONS.CONTENT_REVIEW}>
                  <ReviewQueue />
                </PermissionRoute>
              }
            />
            <Route
              path="inbox"
              element={
                <PermissionRoute permission={PERMISSIONS.CONTENT_VIEW}>
                  <Inbox />
                </PermissionRoute>
              }
            />
            <Route
              path="trash"
              element={
                <PermissionRoute permission={PERMISSIONS.TRASH_VIEW}>
                  <Trash />
                </PermissionRoute>
              }
            />
            <Route
              path="users"
              element={
                <PermissionRoute permission={PERMISSIONS.USERS_VIEW}>
                  <UsersManager />
                </PermissionRoute>
              }
            />
            <Route
              path="activity-logs"
              element={
                <PermissionRoute permission={PERMISSIONS.ACTIVITY_LOGS_VIEW}>
                  <ActivityLogs />
                </PermissionRoute>
              }
            />
            <Route
              path="integrations/facebook"
              element={
                <PermissionRoute permission={PERMISSIONS.SOCIAL_VIEW}>
                  <FacebookIntegration />
                </PermissionRoute>
              }
            />
          </Route>

          {/* Public site */}
          <Route path="/*" element={
            <PublicLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/academics" element={<Academics />} />
                <Route path="/facilities" element={<Facilities />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/notices" element={<Notices />} />
                <Route path="/notices/:id" element={<NoticeDetails />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetails />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/admissions" element={<Admissions />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PublicLayout>
          } />
        </Routes>
          </Suspense>
        </IStudentProvider>
      </BrowserRouter>
    </SiteSettingsProvider>
  );
}

export default App;
