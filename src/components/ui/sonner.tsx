import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:px-5 group-[.toaster]:py-4",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold group-[.toast]:rounded-lg",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:!border-[hsl(var(--success)_/_0.3)] group-[.toaster]:!bg-[hsl(var(--success)_/_0.08)]",
          error: "group-[.toaster]:!border-[hsl(var(--destructive)_/_0.3)] group-[.toaster]:!bg-[hsl(var(--destructive)_/_0.08)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
