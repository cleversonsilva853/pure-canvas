import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="md:ml-64 min-h-screen transition-all duration-300">
        <div className="p-4 md:p-6 lg:p-8 pt-16 md:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
