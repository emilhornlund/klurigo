import './instrument'
import { TokenScope } from '@klurigo/common'
import * as Sentry from '@sentry/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { Bounce, ToastContainer } from 'react-toastify'

import { ProtectedRoute } from './components'
import config from './config'
import AuthContextProvider from './context/auth'
import GameContextProvider from './context/game'
import UserContextProvider from './context/user'
import {
  AuthGamePage,
  AuthGoogleCallbackPage,
  AuthLoginPage,
  AuthPasswordForgotPage,
  AuthPasswordResetPage,
  AuthRegisterPage,
  AuthVerifyPage,
  DiscoverRailsPage,
  DiscoverSectionPage,
  ErrorPage,
  GameJoinPage,
  GamePage,
  GameResultsPage,
  HomePage,
  ProfileGamesPage,
  ProfileQuizzesPage,
  ProfileSettingsPage,
  QuizCreatorPage,
  QuizDetailsPage,
} from './pages'

import './styles/fonts.scss'
import './styles/index.css'

import 'react-toastify/dist/ReactToastify.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <UserContextProvider>
        <AuthContextProvider>
          <Outlet />
        </AuthContextProvider>
      </UserContextProvider>
    ),
    children: [
      {
        path: '/',
        index: true,
        element: <HomePage />,
      },
      {
        path: '/auth/login',
        element: (
          <ProtectedRoute authenticated={false}>
            <AuthLoginPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/auth/google/callback',
        element: (
          <ProtectedRoute authenticated={false}>
            <AuthGoogleCallbackPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/auth/register',
        element: (
          <ProtectedRoute authenticated={false}>
            <AuthRegisterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/auth/verify',
        element: <AuthVerifyPage />,
      },
      {
        path: '/auth/password/forgot',
        element: (
          <ProtectedRoute authenticated={false}>
            <AuthPasswordForgotPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/auth/password/reset',
        element: (
          <ProtectedRoute authenticated={false}>
            <AuthPasswordResetPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/auth/game',
        element: <AuthGamePage />,
      },
      {
        path: '/discover',
        element: (
          <ProtectedRoute>
            <DiscoverRailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/discover/section/:key',
        element: (
          <ProtectedRoute>
            <DiscoverSectionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/join',
        element: (
          <ProtectedRoute scope={TokenScope.Game}>
            <GameContextProvider>
              <GameJoinPage />
            </GameContextProvider>
          </ProtectedRoute>
        ),
      },
      {
        path: '/game',
        element: (
          <ProtectedRoute scope={TokenScope.Game}>
            <GameContextProvider>
              <GamePage />
            </GameContextProvider>
          </ProtectedRoute>
        ),
      },
      {
        path: '/game/results/:gameID',
        element: (
          <ProtectedRoute>
            <GameResultsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/profile/settings',
        element: (
          <ProtectedRoute>
            <ProfileSettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/profile/quizzes',
        element: (
          <ProtectedRoute>
            <ProfileQuizzesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/profile/games',
        element: (
          <ProtectedRoute>
            <ProfileGamesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/quiz/create',
        element: (
          <ProtectedRoute>
            <QuizCreatorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/quiz/details/:quizId',
        element: (
          <ProtectedRoute>
            <QuizDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/quiz/details/:quizId/edit',
        element: (
          <ProtectedRoute>
            <QuizCreatorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/debug-sentry',
        element: (
          <button
            onClick={() => {
              fetch(config.klurigoServiceUrl + '/debug-sentry', {
                method: 'GET',
              }).finally(() => {
                throw new Error('This is your first error from quiz!')
              })
            }}>
            Break the world
          </button>
        ),
      },
    ],
    errorElement: <ErrorPage />,
  },
])

const queryClient = new QueryClient()

const container = document.getElementById('root')!

createRoot(container, {
  // Callback called when an error is thrown and not caught by an ErrorBoundary.
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack)
  }),
  // Callback called when React catches an error in an ErrorBoundary.
  onCaughtError: Sentry.reactErrorHandler(),
  // Callback called when React automatically recovers from errors.
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
      transition={Bounce}
    />
  </StrictMode>,
)
