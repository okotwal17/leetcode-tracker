// Route table. Everything renders inside <Layout/>, which supplies the nav bar,
// the shared modals, and the app context. The Feed is the index route, so it's
// the first thing users see; All Problems lives at /problems. Any unknown path
// bounces back to the feed.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import FeedPage from "./pages/FeedPage";
import AllProblemsPage from "./pages/AllProblemsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<FeedPage />} />
          <Route path="problems" element={<AllProblemsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
