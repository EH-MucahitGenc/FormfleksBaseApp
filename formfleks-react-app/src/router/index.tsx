import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import { PageContainer } from '@/components/ui/PageContainer';

// ─── Lazy Page Imports (Code-Splitting) ──────────────────────────────
// Every page is lazy-loaded for optimal initial bundle size.
const Login = lazy(() => import('@/features/auth/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const MyForms = lazy(() => import('@/features/forms/MyForms').then(m => ({ default: m.MyForms })));
const NewFormRequest = lazy(() => import('@/features/forms/NewFormRequest').then(m => ({ default: m.NewFormRequest })));
const FormDetail = lazy(() => import('@/features/forms/FormDetail').then(m => ({ default: m.FormDetail })));
const PendingApprovals = lazy(() => import('@/features/approvals/PendingApprovals').then(m => ({ default: m.PendingApprovals })));
const ApprovalHistory = lazy(() => import('@/features/approvals/ApprovalHistory').then(m => ({ default: m.ApprovalHistory })));
const DynamicFormViewer = lazy(() => import('@/features/dynamic-forms/DynamicFormViewer').then(m => ({ default: m.DynamicFormViewer })));
const Users = lazy(() => import('@/features/admin/Users').then(m => ({ default: m.Users })));
const Roles = lazy(() => import('@/features/admin/Roles').then(m => ({ default: m.Roles })));

const LocationRoles = lazy(() => import('@/features/admin/LocationRoles'));
const AuditLogs = lazy(() => import('@/features/admin/AuditLogs').then(m => ({ default: m.AuditLogs })));
const FormDesigner = lazy(() => import('@/features/admin/form-designer/FormDesigner').then(m => ({ default: m.FormDesigner })));
const HrReportingDashboard = lazy(() => import('@/features/reports/HrReportingDashboard').then(m => ({ default: m.HrReportingDashboard })));
const WorkflowDesigner = lazy(() => import('@/features/admin/workflow-designer/WorkflowDesigner').then(m => ({ default: m.WorkflowDesigner })));
const ApplicationSettings = lazy(() => import('@/features/settings/ApplicationSettings').then(m => ({ default: m.ApplicationSettings })));
const UserProfile = lazy(() => import('@/features/settings/UserProfile').then(m => ({ default: m.UserProfile })));
const Delegations = lazy(() => import('@/features/profile/Delegations').then(m => ({ default: m.Delegations })));
const PersonnelSync = lazy(() => import('@/features/admin/personnel-sync/PersonnelSyncDashboard'));

// ─── Suspense Fallback ───────────────────────────────────────────────
const PageFallback = () => (
  <PageContainer>
    <FfSkeletonLoader type="text" className="w-64 mb-4" />
    <FfSkeletonLoader type="card" />
  </PageContainer>
);

// ─── Route Definition ────────────────────────────────────────────────
export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <Suspense fallback={<div />}><Login /></Suspense> },
      { path: '', element: <Navigate to="/auth/login" replace /> }
    ]
  },
  {
    path: '/',
    element: (
      <ErrorBoundary>
        <ProtectedRoute />
      </ErrorBoundary>
    ),
    errorElement: (
      <ErrorBoundary>
        <div /> 
      </ErrorBoundary>
    ),
    children: [
      {
        path: '',
        element: <MainLayout />,
        children: [
          { path: 'dashboard', element: <Suspense fallback={<PageFallback />}><Dashboard /></Suspense> },
          {
            path: 'forms',
            children: [
              { path: '', element: <Suspense fallback={<PageFallback />}><MyForms /></Suspense> },
              { path: 'd/:formCode', element: <Suspense fallback={<PageFallback />}><DynamicFormViewer /></Suspense> },
              { path: 'create', element: <Suspense fallback={<PageFallback />}><NewFormRequest /></Suspense> },
              { path: ':id', element: <Suspense fallback={<PageFallback />}><FormDetail /></Suspense> }
            ]
          },
          {
            path: 'approvals',
            children: [
              { path: '', element: <Suspense fallback={<PageFallback />}><PendingApprovals /></Suspense> },
              { path: 'history', element: <Suspense fallback={<PageFallback />}><ApprovalHistory /></Suspense> }
            ]
          },
          { 
            path: 'users', 
            element: <ProtectedRoute requiredPermission="Users.Manage"><Suspense fallback={<PageFallback />}><Users /></Suspense></ProtectedRoute> 
          },
          {
            path: 'admin',
            children: [
              { 
                path: 'roles', 
                element: <ProtectedRoute requiredPermission="Roles.Manage"><Suspense fallback={<PageFallback />}><Roles /></Suspense></ProtectedRoute> 
              },
              { 
                path: 'location-roles', 
                element: <ProtectedRoute requiredPermission="Users.Manage"><Suspense fallback={<PageFallback />}><LocationRoles /></Suspense></ProtectedRoute> 
              },
              { 
                path: 'audit-logs', 
                element: <ProtectedRoute requiredPermission="System.AuditLogs"><Suspense fallback={<PageFallback />}><AuditLogs /></Suspense></ProtectedRoute> 
              },
              { 
                path: 'personnel-sync', 
                element: <ProtectedRoute requiredPermission="Personnel.Sync"><Suspense fallback={<PageFallback />}><PersonnelSync /></Suspense></ProtectedRoute> 
              },
              { 
                path: 'system-settings', 
                element: <ProtectedRoute requiredPermission="System.Settings"><Suspense fallback={<PageFallback />}><ApplicationSettings /></Suspense></ProtectedRoute> 
              },
              { 
                path: 'form-designer', 
                element: <ProtectedRoute requiredPermission="Forms.Design"><Suspense fallback={<PageFallback />}><FormDesigner /></Suspense></ProtectedRoute> 
              },
              { 
                path: 'workflow-designer', 
                element: <ProtectedRoute requiredPermission="Workflows.Manage"><Suspense fallback={<PageFallback />}><WorkflowDesigner /></Suspense></ProtectedRoute> 
              }
            ]
          },
          {
            path: 'hr',
            children: [
              { 
                path: 'reports', 
                element: <ProtectedRoute requiredPermission="Reports.View"><Suspense fallback={<PageFallback />}><HrReportingDashboard /></Suspense></ProtectedRoute> 
              }
            ]
          },
          {
            path: 'settings',
            children: [
              { path: 'profile', element: <Suspense fallback={<PageFallback />}><UserProfile /></Suspense> },
              { path: 'delegations', element: <Suspense fallback={<PageFallback />}><Delegations /></Suspense> }
            ]
          },
          { path: '*', element: <Navigate to="/dashboard" replace /> }
        ]
      }
    ]
  }
]);
