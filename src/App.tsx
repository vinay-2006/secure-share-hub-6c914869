import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import UploadFile from "./pages/UploadFile";
import ShareResult from "./pages/ShareResult";
import MyShares from "./pages/MyShares";
import DownloadAccess from "./pages/DownloadAccess";
import AccessLogs from "./pages/AccessLogs";
import AdminPanel from "./pages/AdminPanel";
import AppLayout from "./layouts/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/download/:id" element={<DownloadAccess />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<UploadFile />} />
            <Route path="/share-result" element={<ShareResult />} />
            <Route path="/shares" element={<MyShares />} />
            <Route path="/logs" element={<AccessLogs />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
