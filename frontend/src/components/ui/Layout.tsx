import { ReactNode, useState } from "react";
import { Navbar } from "./Navbar";

export function Layout({ children }: { children: ReactNode }) {
  // Puedes agregar aquí un sidebar si lo deseas
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-5xl mx-auto p-4">{children}</main>
    </div>
  );
}
