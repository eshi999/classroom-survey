import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { PresentPage } from './pages/PresentPage.tsx'
import { ResultsPage } from './pages/ResultsPage.tsx'
import { StudentSurveyPage } from './pages/StudentSurveyPage.tsx'
import { SurveyEditorPage } from './pages/SurveyEditorPage.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surveys/new"
          element={
            <ProtectedRoute>
              <SurveyEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surveys/:id/edit"
          element={
            <ProtectedRoute>
              <SurveyEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surveys/:id/present"
          element={
            <ProtectedRoute>
              <PresentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surveys/:id/results"
          element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/s/:slug" element={<StudentSurveyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
