export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]"
      >
        <defs>
          <linearGradient id="smartdesk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Container / Monitor Slate */}
        <rect
          x="4"
          y="6"
          width="40"
          height="32"
          rx="10"
          stroke="url(#smartdesk-grad)"
          strokeWidth="3"
          className="stroke-indigo-500"
          fill="#0F172A"
          fillOpacity="0.8"
        />

        {/* S-Flow Integrated Circuit */}
        <path
          d="M28 15H20C17.7909 15 16 16.7909 16 19C16 21.2091 17.7909 23 20 23H28C30.2091 23 32 24.7909 32 27C32 29.2091 30.2091 31 28 31H18"
          stroke="url(#smartdesk-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* AI Sparkle / Node Core */}
        <circle cx="28" cy="15" r="2.5" fill="#38BDF8" />
        <circle cx="18" cy="31" r="2.5" fill="#818CF8" />
        
        {/* Base Stand Indicator */}
        <path
          d="M19 42H29"
          stroke="url(#smartdesk-grad)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}