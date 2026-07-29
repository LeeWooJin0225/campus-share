import type { ReactNode } from "react";

import DashboardSidebar from "@/components/layout/DashboardSidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";

import styles from "./dashboard.module.css";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className={styles.dashboardLayout}>
      <DashboardSidebar />

      <div className={styles.mainArea}>
        <DashboardHeader />

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}