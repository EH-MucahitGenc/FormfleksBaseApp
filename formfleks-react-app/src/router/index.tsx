import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { ProtectedRoute } from '@/app/ProtectedRoute';

import { Login } from '@/features/auth/Login';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { MyForms } from '@/features/forms/MyForms';
import { NewFormRequest } from '@/features/forms/NewFormRequest';
import { FormDetail } from '@/features/forms/FormDetail';
import { PendingApprovals } from '@/features/approvals/PendingApprovals';
import { VisitorManagement } from '@/features/visitors/VisitorManagement';
import { DynamicFormViewer } from '@/features/dynamic-forms/DynamicFormViewer';
import { Users } from '@/features/admin/Users';
import { Roles } from '@/features/admin/Roles';
import { ApplicationSettings } from '@/features/settings/ApplicationSettings';
import { UserProfile } from '@/features/settings/UserProfile';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const Departments = lazy(() => import('@/features/admin/Departments').then(m => ({ default: m.Departments })));
const AuditLogs = lazy(() => import('@/features/admin/AuditLogs').then(m => ({ default: m.AuditLogs })));
const FormDesigner = lazy(() => import('@/features/admin/form-designer/FormDesigner').then(m => ({ default: m.FormDesigner })));
const WorkflowDesigner = lazy(() => import('@/features/admin/workflow-designer/WorkflowDesigner').then(m => ({ default: m.WorkflowDesigner })));

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <Login /> },
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
          { path: 'dashboard', element: <Dashboard /> },
          {
            path: 'forms',
            children: [
              { path: '', element: <MyForms /> },
              { path: 'd/:formCode', element: <DynamicFormViewer /> },
              { path: 'create', element: <NewFormRequest /> },
              { path: 'create/:formCode', element: <NewFormRequest /> },
              { path: ':id', element: <FormDetail /> }
            ]
          },
          { path: 'approvals', element: <PendingApprovals /> },
          { path: 'visitors', element: <VisitorManagement /> },
          { path: 'users', element: <Users /> },
          {
            path: 'admin',
            children: [
              { path: 'roles', element: <Roles /> },
              { path: 'departments', element: <Departments /> },
              { path: 'audit-logs', element: <AuditLogs /> },
              { path: 'form-designer', element: <FormDesigner /> },
              { path: 'workflow-designer', element: <WorkflowDesigner /> },
              { path: 'system-settings', element: <ApplicationSettings /> }
            ]
          },
          {
            path: 'settings',
            children: [
              { path: 'profile', element: <UserProfile /> }
            ]
          },
          { path: '*', element: <Navigate to="/dashboard" replace /> }
        ]
      }
    ]
  }
]);
