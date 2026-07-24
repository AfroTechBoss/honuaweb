"use client";
import React from "react";
import { useApp } from "@/components/app-context";
import { DesktopAdmin } from "@/components/screens/admin";
import { AdminPrivyProvider, AdminAuthGate } from "@/components/admin-auth";
import { Icon } from "@/components/shared";

function MobileBlock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: 32, textAlign: 'center', gap: 20, background: '#0d100e' }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="settings" size={32} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Desktop only</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, maxWidth: 280 }}>
          The admin panel requires a larger screen.<br />Please access it from a desktop or laptop.
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const { nav } = useApp();
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) return <MobileBlock />;

  return (
    <AdminPrivyProvider>
      <AdminAuthGate>
        <DesktopAdmin onNav={nav} params={{}} />
      </AdminAuthGate>
    </AdminPrivyProvider>
  );
}
