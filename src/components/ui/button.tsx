import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 touch-manipulation relative overflow-hidden",
  {
    variants: {
      variant: {
        // Primário — gradiente gold, texto preto, uppercase, shimmer (igual proposta-juba .btn-primary)
        default:
          "bg-gradient-to-r from-[#d4a830] via-[#f0d060] to-[#d4a830] bg-[length:200%_200%] text-[#0a0a0a] uppercase tracking-[0.06em] shadow-[0_4px_20px_rgba(212,168,48,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,168,48,0.35)] active:translate-y-0",
        // Secundário — borda sutil, hover dourado (igual .btn-secondary da proposta)
        secondary:
          "bg-transparent text-[#f0f0f0] border border-[#222222] hover:border-[rgba(212,168,48,0.35)] hover:text-[#f0d060] hover:bg-[rgba(212,168,48,0.1)] uppercase tracking-[0.04em]",
        // Outline
        outline:
          "border border-[#222222] bg-transparent hover:border-[rgba(212,168,48,0.35)] hover:bg-[rgba(212,168,48,0.08)] hover:text-[#f0d060] text-[#f0f0f0]",
        // Destrutivo
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/85 uppercase tracking-[0.04em]",
        // Ghost
        ghost:
          "hover:bg-[rgba(212,168,48,0.08)] hover:text-[#f0d060] text-[#9a9a9a]",
        // Link
        link: "text-[#d4a830] underline-offset-4 hover:underline hover:text-[#f0d060] p-0 h-auto font-normal normal-case tracking-normal",
      },
      size: {
        default:   "h-10 px-5 py-2 rounded-lg text-sm",
        sm:        "h-8 px-3 rounded-md text-xs",
        lg:        "h-12 px-8 rounded-lg text-sm",
        icon:      "h-10 w-10 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
