import { cn } from "@/lib/utils";

interface DeskButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'error' | 'info';
  size?: 'md' | 'lg' | 'xl';
}

export function DeskButton({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: DeskButtonProps) {
  const variants = {
    primary:
      "bg-class-green text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_24px_rgba(124,58,237,0.45)] active:shadow-[0_2px_6px_rgba(124,58,237,0.2)]",
    secondary:
      "bg-carpet-green text-white shadow-[0_4px_16px_rgba(91,33,182,0.35)] hover:shadow-[0_6px_24px_rgba(91,33,182,0.45)] active:shadow-[0_2px_6px_rgba(91,33,182,0.2)]",
    // info is unified with primary (violet) — kept for back-compat
    info:
      "bg-class-green text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_24px_rgba(124,58,237,0.45)] active:shadow-[0_2px_6px_rgba(124,58,237,0.2)]",
    outline:
      "border-2 border-slate-200 text-board-black bg-white hover:bg-slate-50 shadow-sm hover:shadow-md",
    success:
      "bg-success text-white shadow-[0_4px_16px_rgba(22,163,74,0.35)] hover:shadow-[0_6px_24px_rgba(22,163,74,0.45)]",
    error:
      "bg-error text-white shadow-none opacity-60",
  };

  const sizes = {
    md: "px-6 py-3 text-2xl rounded-2xl",
    lg: "px-10 py-6 text-4xl rounded-3xl",
    xl: "px-16 py-10 text-6xl rounded-[2.5rem] font-bold",
  };

  return (
    <button
      className={cn(
        "font-sans transition-all duration-150 flex items-center justify-center active:scale-[0.97] touch-manipulation select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
