import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function AnimatedBackground({ className, children }: AnimatedBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
      
      {/* Animated particles */}
      <div className="absolute inset-0">
        {/* Particle 1 */}
        <div 
          className="absolute h-2 w-2 rounded-full bg-primary/30 animate-float-particle"
          style={{ top: '20%', left: '15%', animationDelay: '0s' }}
        />
        {/* Particle 2 */}
        <div 
          className="absolute h-3 w-3 rounded-full bg-primary/20 animate-float-particle"
          style={{ top: '40%', left: '70%', animationDelay: '0.5s' }}
        />
        {/* Particle 3 */}
        <div 
          className="absolute h-1.5 w-1.5 rounded-full bg-primary/40 animate-float-particle"
          style={{ top: '60%', left: '30%', animationDelay: '1s' }}
        />
        {/* Particle 4 */}
        <div 
          className="absolute h-2.5 w-2.5 rounded-full bg-primary/25 animate-float-particle"
          style={{ top: '75%', left: '80%', animationDelay: '1.5s' }}
        />
        {/* Particle 5 */}
        <div 
          className="absolute h-2 w-2 rounded-full bg-accent/30 animate-float-particle"
          style={{ top: '30%', left: '50%', animationDelay: '2s' }}
        />
        {/* Particle 6 */}
        <div 
          className="absolute h-1.5 w-1.5 rounded-full bg-accent/20 animate-float-particle"
          style={{ top: '85%', left: '25%', animationDelay: '2.5s' }}
        />
      </div>

      {/* Glow effect */}
      <div className="absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-primary/10 blur-3xl animate-pulse-soft" />
      <div className="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-accent/5 blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
