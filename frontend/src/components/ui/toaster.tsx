import { ReactNode } from "react"

interface ToastProps {
  children: ReactNode
}

export function Toaster({ children }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {children}
    </div>
  )
}

export function Toast({ children }: ToastProps) {
  return (
    <div className="bg-white text-gray-900 rounded-lg shadow-lg p-4 min-w-[200px]">
      {children}
    </div>
  )
}
