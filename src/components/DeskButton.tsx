import { cn } from "@/lib/utils";

interface DeskButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'error';
  size?: 'md' | 'lg' | 'xl';
}

export function DeskButton({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: DeskButtonProps) {
  const variants = {
    primary: "bg-class-green text-board-black shadow-[0_8px_0_0_rgba(163,230,53,0.3)] active:shadow-none translate-y-[-4px] active:translate-y-0",
    secondary: "bg-carpet-green text-white shadow-[0_8px_0_0_rgba(20,83,45,0.3)] active:shadow-none translate-y-[-4px] active:translate-y-0",
    outline: "border-4 border-class-green text-board-black",
    success: "bg-success text-white",
    error: "bg-error text-white shadow-none translate-y-0 scale-95 opacity-50",
  };

  const sizes = {
    md: "px-6 py-3 text-2xl rounded-2xl",
    lg: "px-10 py-6 text-4xl rounded-3xl",
    xl: "px-16 py-10 text-6xl rounded-[2.5rem] font-bold",
  };

  return (
    <button
      className={cn(
        "font-sans transition-all duration-75 flex items-center justify-center active:scale-95 touch-manipulation",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
