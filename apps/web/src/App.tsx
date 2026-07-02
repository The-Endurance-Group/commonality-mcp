import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Protected } from "./components/Protected";
import { useSessionBootstrap } from "./lib/useSession";
import { Billing } from "./pages/Billing";
import { Dashboard } from "./pages/Dashboard";
import { Invites } from "./pages/Invites";
import { Marketing } from "./pages/Marketing";
import { Onboarding } from "./pages/Onboarding";
import { Privacy } from "./pages/Privacy";

export default function App() {
  useSessionBootstrap();

  return (
    <Routes>
      <Route path="/" element={<Marketing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route
        path="/onboarding"
        element={
          <Protected onboarding>
            <Onboarding />
          </Protected>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Layout>
              <Dashboard />
            </Layout>
          </Protected>
        }
      />
      <Route
        path="/invites"
        element={
          <Protected admin>
            <Layout>
              <Invites />
            </Layout>
          </Protected>
        }
      />
      <Route
        path="/billing"
        element={
          <Protected admin>
            <Layout>
              <Billing />
            </Layout>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
