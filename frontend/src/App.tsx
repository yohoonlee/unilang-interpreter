import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/Toaster'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/HomePage'
import MeetingPage from '@/pages/MeetingPage'
import MeetingListPage from '@/pages/MeetingListPage'
import MeetingHistoryPage from '@/pages/MeetingHistoryPage'
import SettingsPage from '@/pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/meetings" element={<MeetingListPage />} />
          <Route path="/meeting/:meetingId" element={<MeetingPage />} />
          <Route path="/history/:meetingId" element={<MeetingHistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster />
    </BrowserRouter>
  )
}

export default App

