import { createBrowserRouter, Navigate } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { HomePage } from '@/features/home/HomePage'
import { TopStudentsPage } from '@/features/top-students/TopStudentsPage'
import { AchievementsPage } from '@/features/achievements/AchievementsPage'
import { AchievementDetailPage } from '@/features/achievements/AchievementDetailPage'
import { EventsPage } from '@/features/events/EventsPage'
import { EventDetailPage } from '@/features/events/EventDetailPage'
import { BlogPage } from '@/features/blog/BlogPage'
import { BlogDetailPage } from '@/features/blog/BlogDetailPage'
import { ContactPage } from '@/features/contact/ContactPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { GuestRoute } from '@/features/auth/GuestRoute'
import { TermsOfApplyingPage } from '@/features/terms/TermsOfApplyingPage'
import { ProfileLayout } from '@/features/profile/ProfileLayout'
import { PersonalInfoPage } from '@/features/profile/PersonalInfoPage'
import { CertificatePage } from '@/features/profile/CertificatePage'
import { MonthlyEvaluationsPage } from '@/features/profile/MonthlyEvaluationsPage'
import { WeeklyEvaluationsPage } from '@/features/profile/WeeklyEvaluationsPage'
import { SchedulePage } from '@/features/profile/SchedulePage'
import { ParentSummonPage } from '@/features/profile/ParentSummonPage'
import { StatisticsPage } from '@/features/profile/StatisticsPage'
import { AttendancePage } from '@/features/profile/AttendancePage'
import { FeesPage } from '@/features/profile/FeesPage'
import { ConductPage } from '@/features/profile/ConductPage'
import { BusPage } from '@/features/profile/BusPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { GroupTaskDetailPage } from '@/features/groups/GroupTaskDetailPage'
import { IntroductionCardPage } from '@/features/introduction-card/IntroductionCardPage'
import { ComplaintTicketsPage } from '@/features/complaint-tickets/ComplaintTicketsPage'
import { ComplaintTicketDetailPage } from '@/features/complaint-tickets/ComplaintTicketDetailPage'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'top-students', element: <TopStudentsPage /> },
      { path: 'achievements', element: <AchievementsPage /> },
      { path: 'achievements/:id', element: <AchievementDetailPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:id', element: <EventDetailPage /> },
      { path: 'blog', element: <BlogPage /> },
      { path: 'blog/:id', element: <BlogDetailPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'terms-of-applying', element: <TermsOfApplyingPage /> },
      {
        element: <GuestRoute />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },
      {
        path: 'profile',
        element: <ProtectedRoute />,
        children: [
          {
            element: <ProfileLayout />,
            children: [
              { index: true, element: <PersonalInfoPage /> },
              {
                path: 'certificate',
                element: <CertificatePage />,
              },
              {
                path: 'monthly-evaluations',
                element: <MonthlyEvaluationsPage />,
              },
              {
                path: 'weekly-evaluations',
                element: <WeeklyEvaluationsPage />,
              },
              {
                path: 'schedule',
                element: <SchedulePage />,
              },
              {
                path: 'attendance',
                element: <AttendancePage />,
              },
              {
                path: 'fees',
                element: <FeesPage />,
              },
              {
                path: 'parent-summon',
                element: <ParentSummonPage />,
              },
              {
                path: 'conduct',
                element: <ConductPage />,
              },
              {
                path: 'bus',
                element: <BusPage />,
              },
              {
                path: 'statistics',
                element: <StatisticsPage />,
              },
              {
                path: 'notifications',
                element: <NotificationsPage />,
              },
              {
                path: 'groups',
                element: <GroupsPage />,
              },
              {
                path: 'groups/:groupId',
                element: <GroupDetailPage />,
              },
              {
                path: 'groups/:groupId/tasks/:taskId',
                element: <GroupTaskDetailPage />,
              },
              {
                path: 'introduction-card',
                element: <IntroductionCardPage />,
              },
              {
                path: 'complaint-tickets',
                element: <ComplaintTicketsPage />,
              },
              {
                path: 'complaint-tickets/:ticketId',
                element: <ComplaintTicketDetailPage />,
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
