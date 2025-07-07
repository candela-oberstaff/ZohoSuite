import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type Variant = "default" | "ghost";

export function Button({
  children,
  variant = "default",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      className={clsx(
        "px-4 py-2 rounded font-medium transition",
        variant === "default"
          ? "bg-green-600 text-white hover:bg-green-700"
          : "bg-transparent text-green-600 hover:bg-green-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
