"use client";
import React, { Suspense } from "react";
import { useApp } from "@/components/app-context";
import { DesktopSearch } from "@/components/screens/search";

function SearchPage() {
  const { nav } = useApp();
  return <DesktopSearch onNav={nav} />;
}

export default function Page() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
