import { ReactNode } from "react";

export function Pagination({ children }: { children: ReactNode }) {
  return <nav className="flex justify-center">{children}</nav>;
}

export function PaginationContent({ children }: { children: ReactNode }) {
  return <ul className="inline-flex -space-x-px">{children}</ul>;
}

export function PaginationItem({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export function PaginationLink({
  isActive,
  onClick,
  children,
}: {
  isActive?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`px-3 py-1 border rounded mx-1 ${
        isActive
          ? "bg-green-500 text-white border-green-500"
          : "bg-white text-gray-700 border-gray-300 hover:bg-green-100"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
