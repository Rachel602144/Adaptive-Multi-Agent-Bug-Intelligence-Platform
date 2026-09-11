import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { BugResult } from "./pages/BugResult";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { SubmitBug } from "./pages/SubmitBug";

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<SubmitBug />} />
          <Route path="/bugs/:id" element={<BugResult />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  );
}
