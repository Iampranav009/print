import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#37d37d] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  { variants: { variant: { default: "bg-[#14a05a] text-white shadow-[0_10px_30px_rgba(20,160,90,.22)] hover:bg-[#11874d]", outline: "border border-white/15 bg-white/[.04] text-white hover:border-white/25 hover:bg-white/[.08]", secondary: "bg-zinc-100 text-zinc-950 hover:bg-zinc-200", ghost: "text-zinc-300 hover:bg-white/[.06] hover:text-white" }, size: { default: "h-11 px-5", sm: "h-9 rounded-lg px-3", lg: "h-13 px-6 text-[15px]" } }, defaultVariants: { variant: "default", size: "default" } }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />);
Button.displayName = "Button";
export { Button, buttonVariants };
