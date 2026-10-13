import { BrowserRouter, Routes, Route } from "react-router-dom";

import { SiteSettingsProvider } from "./context/SiteSettingsContext";
import TopBar from "./components/layout/TopBar";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

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

import AdminLogin from "./admin/AdminLogin";
import ResetPassword from "./admin/ResetPassword";
import AdminLayout from "./admin/AdminLayout";
import ProtectedRoute from "./admin/ProtectedRoute";
import AdminDashboard from "./admin/AdminDashboard";
import AdminMessages from "./admin/AdminMessages";
import SiteSettingsManager from "./admin/SiteSettingsManager";
import LeadershipManager from "./admin/LeadershipManager";
import PageContentManager from "./admin/PageContentManager";
import ResourceManager from "./admin/ResourceManager";
import ReviewQueue from "./admin/ReviewQueue";
import Inbox from "./admin/Inbox";
import MediaLibrary from "./admin/MediaLibrary";
import Trash from "./admin/Trash";
import UsersManager from "./admin/UsersManager";
import ActivityLogs from "./admin/ActivityLogs";
import FacebookIntegration from "./admin/FacebookIntegration";
import PermissionRoute from "./admin/PermissionRoute";
import { PERMISSIONS } from "./admin/permissions";
import { resourceConfigs } from "./admin/resourceConfigs";

function PublicLayout({ children }) {
  return (
    <>
      <TopBar />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

function App() {
  return (
    <SiteSettingsProvider>
      <BrowserRouter>
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
                    <ResourceManager config={config} />
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
      </BrowserRouter>
    </SiteSettingsProvider>
  );
}

export default App;
