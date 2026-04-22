import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./layout/AppShell.jsx";
import DashboardPage from "./pages/Dashboard/DashboardPage.jsx";
import CampaignsListPage from "./pages/Campaigns/CampaignsListPage.jsx";
import CampaignNewPage from "./pages/Campaigns/CampaignNewPage.jsx";
import CampaignDetailPage from "./pages/Campaigns/CampaignDetailPage.jsx";
import SentimentPage from "./pages/Sentiment/SentimentPage.jsx";
import RoiPage from "./pages/Roi/RoiPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/campaigns" element={<CampaignsListPage />} />
        <Route path="/campaigns/new" element={<CampaignNewPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/sentiment" element={<SentimentPage />} />
        <Route path="/roi" element={<RoiPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
