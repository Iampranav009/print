import * as React from "react";
import { cn } from "@/lib/utils";
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn("rounded-2xl border border-zinc-200 bg-white", className)} {...props} />);
Card.displayName = "Card";
export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn("p-6", className)} {...props} />);
CardHeader.displayName = "CardHeader";
export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn("px-6 pb-6", className)} {...props} />);
CardContent.displayName = "CardContent";
