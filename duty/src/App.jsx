import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RotaProvider } from './context/RotaContext';
import Navbar from './components/Navbar';
import CalendarPage from './pages/CalendarPage';
import TeamsPage from './pages/TeamsPage';
import RequestsPage from './pages/RequestsPage';
import './App.css';

export default function App() {
  return (
    <RotaProvider>
      <BrowserRouter>
        <div className="app">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<CalendarPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/requests" element={<RequestsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </RotaProvider>
  );
}
