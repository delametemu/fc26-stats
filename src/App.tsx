import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ClubPage from "./pages/ClubPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/club/:clubId" element={<ClubPage />} />
      </Routes>
    </Layout>
  );
}
