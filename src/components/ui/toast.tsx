import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = forwardRef<
  HTMLOListElement,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 left-1/2 z-[100] flex w-[min(96vw,24rem)] -translate-x-1/2 flex-col gap-2 p-4",
      "pb-[calc(1rem+env(safe-area-inset-bottom))]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-card border p-4 shadow-card data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: "border-ink/10 bg-cream-dark text-ink",
        success: "border-green-200 bg-green-50 text-green-900",
        error:   "border-red-300 bg-red-50 text-red-900",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export const Toast = forwardRef<
  HTMLLIElement,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
));
Toast.displayName = "Toast";

export const ToastTitle = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = "ToastTitle";

export const ToastDescription = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn("text-sm text-ink-muted", className)} {...props} />
));
ToastDescription.displayName = "ToastDescription";

export const ToastClose = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn("absolute right-2 top-2 rounded p-1 text-ink/60 hover:bg-ink/5 hover:text-ink", className)}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = "ToastClose";
