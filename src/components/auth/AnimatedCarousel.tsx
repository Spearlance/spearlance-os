import { useState } from 'react';

interface CarouselItem {
  icon: string;
  text: string;
  gradient: string;
}

interface ScrollingRowProps {
  items: CarouselItem[];
  direction: 'left' | 'right';
  speed?: number;
}

const aiSuggestions: CarouselItem[] = [
  { icon: "🎯", text: "Analyze competitor social strategy", gradient: "from-blue-400/20 to-cyan-400/20" },
  { icon: "✨", text: "Generate brand voice guidelines", gradient: "from-purple-400/20 to-pink-400/20" },
  { icon: "📊", text: "Create quarterly marketing plan", gradient: "from-green-400/20 to-emerald-400/20" },
  { icon: "💡", text: "Draft Instagram carousel ideas", gradient: "from-yellow-400/20 to-orange-400/20" },
  { icon: "🚀", text: "Optimize email campaign timing", gradient: "from-red-400/20 to-rose-400/20" },
  { icon: "🎨", text: "Design consistent color palette", gradient: "from-indigo-400/20 to-violet-400/20" },
  { icon: "📱", text: "Schedule TikTok content series", gradient: "from-teal-400/20 to-cyan-400/20" },
  { icon: "🎭", text: "Define brand personality traits", gradient: "from-fuchsia-400/20 to-pink-400/20" }
];

const actionPlanItems: CarouselItem[] = [
  { icon: "✅", text: "Review Q1 performance metrics", gradient: "from-emerald-400/20 to-green-400/20" },
  { icon: "📅", text: "Book client strategy session", gradient: "from-blue-400/20 to-indigo-400/20" },
  { icon: "📝", text: "Update brand messaging doc", gradient: "from-purple-400/20 to-violet-400/20" },
  { icon: "🎥", text: "Script YouTube intro video", gradient: "from-red-400/20 to-orange-400/20" },
  { icon: "💬", text: "Respond to customer feedback", gradient: "from-cyan-400/20 to-sky-400/20" },
  { icon: "📈", text: "Track website conversion goals", gradient: "from-green-400/20 to-lime-400/20" },
  { icon: "🔍", text: "Audit SEO performance", gradient: "from-yellow-400/20 to-amber-400/20" }
];

const featureHighlights: CarouselItem[] = [
  { icon: "🤖", text: "AI-Powered Brand Guide", gradient: "from-violet-400/20 to-purple-400/20" },
  { icon: "📊", text: "Real-Time Analytics Dashboard", gradient: "from-blue-400/20 to-cyan-400/20" },
  { icon: "🎯", text: "Smart Audience Targeting", gradient: "from-pink-400/20 to-rose-400/20" },
  { icon: "✍️", text: "Auto Caption Generation", gradient: "from-green-400/20 to-emerald-400/20" },
  { icon: "📅", text: "Integrated Calendar Booking", gradient: "from-orange-400/20 to-yellow-400/20" },
  { icon: "💾", text: "Centralized Asset Library", gradient: "from-indigo-400/20 to-blue-400/20" },
  { icon: "🎨", text: "Dynamic Mood Boards", gradient: "from-fuchsia-400/20 to-pink-400/20" }
];

const ScrollingRow = ({ items, direction, speed = 30 }: ScrollingRowProps) => {
  const duplicatedItems = [...items, ...items];
  
  return (
    <div className="relative h-20 overflow-hidden">
      <div 
        className={`flex gap-4 ${direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right'}`}
        style={{ 
          animationDuration: `${speed}s`,
          willChange: 'transform'
        }}
      >
        {duplicatedItems.map((item, idx) => (
          <div
            key={idx}
            className={`
              group relative
              px-6 py-4
              rounded-2xl
              bg-white/10
              backdrop-blur-md
              border border-white/30
              shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]
              hover:bg-white/20
              hover:border-white/40
              hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.2)]
              transition-all duration-300
              whitespace-nowrap
              flex items-center gap-3
              min-w-fit
              hover:scale-105
              bg-gradient-to-r ${item.gradient}
            `}
          >
            <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
              {item.icon}
            </span>
            <span className="text-base font-medium text-white/90 tracking-wide">
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AnimatedCarousel = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col justify-center p-8 space-y-6 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Interactive gradient overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              600px circle at ${mousePos.x}px ${mousePos.y}px,
              rgba(255, 255, 255, 0.05),
              transparent 40%,
              rgba(0, 0, 0, 0.3)
            )
          `
        }}
      />

      {/* Content rows */}
      <div className="relative z-10 space-y-6">
        <ScrollingRow items={aiSuggestions} direction="right" speed={35} />
        <ScrollingRow items={actionPlanItems} direction="left" speed={28} />
        <ScrollingRow items={featureHighlights} direction="right" speed={32} />
        <ScrollingRow items={aiSuggestions} direction="left" speed={40} />
      </div>
    </div>
  );
};
