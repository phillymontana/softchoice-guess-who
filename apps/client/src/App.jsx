import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NavBar from './components/NavBar';
import GalleryPage from './pages/GalleryPage';
import LeaderboardPage from './pages/LeaderboardPage';
import VoteModal from './components/VoteModal';
import useModalStore from './store/modalStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppContent() {
  const { openModal } = useModalStore();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      <NavBar />
      <main>
        <Routes>
          <Route
            path="/"
            element={<GalleryPage onImageClick={(img) => openModal(img)} />}
          />
          <Route
            path="/leaderboard"
            element={<LeaderboardPage onImageClick={(img) => openModal(img)} />}
          />
          <Route
            path="/image/:imageKey"
            element={<GalleryPage onImageClick={(img) => openModal(img)} />}
          />
        </Routes>
      </main>

      <VoteModal />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
