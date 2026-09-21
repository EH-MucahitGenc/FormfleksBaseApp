import { Navigate, Outlet } from 'react-router-dom';
import { useSurveyNavigation } from '../hooks/useSurveyNavigation';

export function SurveyAccessRoute({ section = 'module' }: { section?: 'module' | 'center' | 'results' }) {
  const { access, canOpenCenter, isPending, isError, refetch } = useSurveyNavigation();
  if (isPending) return <p className="p-8 text-sm text-brand-gray">Anket erişimi kontrol ediliyor...</p>;
  if (isError) return <div role="alert" className="p-8 text-sm text-red-700">Anket erişimi doğrulanamadı. <button className="underline" onClick={() => refetch()}>Tekrar dene</button></div>;
  const allowed = section === 'center' ? canOpenCenter : section === 'results' ? access?.canViewResults : canOpenCenter || access?.canViewResults;
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
