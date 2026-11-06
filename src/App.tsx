import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage.tsx'
import { PlaceholderPage } from './pages/PlaceholderPage.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/login"
          element={
            <PlaceholderPage
              title="Instructor login"
              phase="Phase 3"
              description="Sign-in is not built yet. This page does not check a password."
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            <PlaceholderPage
              title="Instructor dashboard"
              phase="Phase 4"
              description="The survey list will be added in a later phase."
            />
          }
        />
        <Route
          path="/surveys/new"
          element={
            <PlaceholderPage
              title="New survey"
              phase="Phase 5"
              description="The survey editor will be added in a later phase."
            />
          }
        />
        <Route
          path="/surveys/:id/edit"
          element={
            <PlaceholderPage
              title="Edit survey"
              phase="Phase 5"
              description="Editing a saved survey will be added in a later phase."
            />
          }
        />
        <Route
          path="/surveys/:id/present"
          element={
            <PlaceholderPage
              title="Present survey"
              phase="Phase 6"
              description="The classroom QR code screen will be added in a later phase."
            />
          }
        />
        <Route
          path="/surveys/:id/results"
          element={
            <PlaceholderPage
              title="Survey results"
              phase="Phase 9"
              description="Counts, percentages, and charts will be added in a later phase."
            />
          }
        />
        <Route
          path="/s/:slug"
          element={
            <PlaceholderPage
              title="Student survey"
              phase="Phase 7"
              description="The public survey students open from a QR code will be added in a later phase."
            />
          }
        />
        <Route
          path="*"
          element={
            <PlaceholderPage
              title="Page not found"
              description="That address is not part of this app."
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
