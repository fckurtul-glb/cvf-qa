import { Navbar } from '../../components/layout/navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 56 }}>{children}</div>
    </>
  );
}
