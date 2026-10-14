import { createBrowserRouter, Navigate } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { HomePage } from '@/features/home/HomePage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { GuestRoute } from '@/features/auth/GuestRoute'
import { ProfileLayout } from '@/features/profile/ProfileLayout'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    // Routes are lazy-loaded; render nothing (rather than warn) while the first chunk loads.
    HydrateFallback: () => null,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'top-students', lazy: () => import('@/features/top-students/TopStudentsPage').then((m) => ({ Component: m.TopStudentsPage })) },
      { path: 'achievements', lazy: () => import('@/features/achievements/AchievementsPage').then((m) => ({ Component: m.AchievementsPage })) },
      { path: 'achievements/:id', lazy: () => import('@/features/achievements/AchievementDetailPage').then((m) => ({ Component: m.AchievementDetailPage })) },
      { path: 'events', lazy: () => import('@/features/events/EventsPage').then((m) => ({ Component: m.EventsPage })) },
      { path: 'events/:id', lazy: () => import('@/features/events/EventDetailPage').then((m) => ({ Component: m.EventDetailPage })) },
      { path: 'blog', lazy: () => import('@/features/blog/BlogPage').then((m) => ({ Component: m.BlogPage })) },
      { path: 'blog/:id', lazy: () => import('@/features/blog/BlogDetailPage').then((m) => ({ Component: m.BlogDetailPage })) },
      { path: 'contact', lazy: () => import('@/features/contact/ContactPage').then((m) => ({ Component: m.ContactPage })) },
      { path: 'terms-of-applying', lazy: () => import('@/features/terms/TermsOfApplyingPage').then((m) => ({ Component: m.TermsOfApplyingPage })) },
      {
        element: <GuestRoute />,
        children: [
          { path: 'login', lazy: () => import('@/features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })) },
          { path: 'register', lazy: () => import('@/features/auth/RegisterPage').then((m) => ({ Component: m.RegisterPage })) },
        ],
      },
      {
        path: 'profile',
        element: <ProtectedRoute />,
        children: [
          {
            element: <ProfileLayout />,
            children: [
              { index: true, lazy: () => import('@/features/profile/PersonalInfoPage').then((m) => ({ Component: m.PersonalInfoPage })) },
              {
                path: 'certificate',
                lazy: () => import('@/features/profile/CertificatePage').then((m) => ({ Component: m.CertificatePage })),
              },
              {
                path: 'monthly-evaluations',
                lazy: () => import('@/features/profile/MonthlyEvaluationsPage').then((m) => ({ Component: m.MonthlyEvaluationsPage })),
              },
              {
                path: 'weekly-evaluations',
                lazy: () => import('@/features/profile/WeeklyEvaluationsPage').then((m) => ({ Component: m.WeeklyEvaluationsPage })),
              },
              {
                path: 'schedule',
                lazy: () => import('@/features/profile/SchedulePage').then((m) => ({ Component: m.SchedulePage })),
              },
              {
                path: 'attendance',
                lazy: () => import('@/features/profile/AttendancePage').then((m) => ({ Component: m.AttendancePage })),
              },
              {
                path: 'fees',
                lazy: () => import('@/features/profile/FeesPage').then((m) => ({ Component: m.FeesPage })),
              },
              {
                path: 'parent-summon',
                lazy: () => import('@/features/profile/ParentSummonPage').then((m) => ({ Component: m.ParentSummonPage })),
              },
              {
                path: 'conduct',
                lazy: () => import('@/features/profile/ConductPage').then((m) => ({ Component: m.ConductPage })),
              },
              {
                path: 'bus',
                lazy: () => import('@/features/profile/BusPage').then((m) => ({ Component: m.BusPage })),
              },
              {
                path: 'telegram',
                lazy: () => import('@/features/profile/TelegramFollowUpPage').then((m) => ({ Component: m.TelegramFollowUpPage })),
              },
              {
                path: 'statistics',
                lazy: () => import('@/features/profile/StatisticsPage').then((m) => ({ Component: m.StatisticsPage })),
              },
              {
                path: 'notifications',
                lazy: () => import('@/features/notifications/NotificationsPage').then((m) => ({ Component: m.NotificationsPage })),
              },
              {
                path: 'groups',
                lazy: () => import('@/features/groups/GroupsPage').then((m) => ({ Component: m.GroupsPage })),
              },
              {
                path: 'groups/:groupId',
                lazy: () => import('@/features/groups/GroupDetailPage').then((m) => ({ Component: m.GroupDetailPage })),
              },
              {
                path: 'groups/:groupId/tasks/:taskId',
                lazy: () => import('@/features/groups/GroupTaskDetailPage').then((m) => ({ Component: m.GroupTaskDetailPage })),
              },
              {
                path: 'introduction-card',
                lazy: () => import('@/features/introduction-card/IntroductionCardPage').then((m) => ({ Component: m.IntroductionCardPage })),
              },
              {
                path: 'complaint-tickets',
                lazy: () => import('@/features/complaint-tickets/ComplaintTicketsPage').then((m) => ({ Component: m.ComplaintTicketsPage })),
              },
              {
                path: 'complaint-tickets/:ticketId',
                lazy: () => import('@/features/complaint-tickets/ComplaintTicketDetailPage').then((m) => ({ Component: m.ComplaintTicketDetailPage })),
              },
              { path: '*', element: <Navigate to="/404" replace /> },
            ],
          },
        ],
      },
      { path: '404', element: <NotFoundPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
