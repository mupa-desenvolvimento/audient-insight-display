import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import Header from "./Header";
interface AppLayoutProps {
  children: ReactNode;
}
const AppLayout = ({
  children
}: AppLayoutProps) => {
  return <>
      <AppSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </>;
};
export default AppLayout;