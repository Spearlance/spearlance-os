import { useState } from 'react';

interface CarouselItem {
  icon: string;
  text: string;
  gradient: string;
}

interface DesignExampleItem {
  icon: string;
  projectName: string;
  category: string;
  gradient: string;
}

interface TestimonialItem {
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
  gradient: string;
}

interface ScrollingRowProps {
  items: (CarouselItem | DesignExampleItem | TestimonialItem)[];
  type: 'standard' | 'design' | 'testimonial';
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

const designExamples: DesignExampleItem[] = [
  { icon: "🎨", projectName: "Modern SaaS Landing", category: "Web Design", gradient: "from-cyan-400/20 to-blue-500/20" },
  { icon: "💼", projectName: "E-commerce Redesign", category: "UX/UI", gradient: "from-violet-400/20 to-purple-500/20" },
  { icon: "✨", projectName: "Portfolio Showcase", category: "Creative", gradient: "from-pink-400/20 to-rose-500/20" },
  { icon: "📱", projectName: "Mobile App Interface", category: "Product Design", gradient: "from-emerald-400/20 to-green-500/20" },
  { icon: "📊", projectName: "Dashboard Analytics", category: "SaaS UI", gradient: "from-amber-400/20 to-orange-500/20" },
  { icon: "🎯", projectName: "Brand Identity System", category: "Branding", gradient: "from-indigo-400/20 to-blue-500/20" }
];

const testimonials: TestimonialItem[] = [
  { 
    name: "Sarah Chen", 
    role: "Marketing Director", 
    company: "TechCorp",
    quote: "Transformed our entire marketing workflow",
    avatar: "👩‍💼",
    gradient: "from-blue-400/20 to-cyan-500/20"
  },
  { 
    name: "Marcus Rodriguez", 
    role: "Founder", 
    company: "GrowthLabs",
    quote: "AI suggestions saved us 20 hours per week",
    avatar: "👨‍💼",
    gradient: "from-purple-400/20 to-pink-500/20"
  },
  { 
    name: "Emily Watson", 
    role: "Brand Manager", 
    company: "Innovate Inc",
    quote: "Finally, a tool that understands brand strategy",
    avatar: "👱‍♀️",
    gradient: "from-green-400/20 to-emerald-500/20"
  },
  { 
    name: "David Kim", 
    role: "CEO", 
    company: "StartupHub",
    quote: "Best investment we've made this year",
    avatar: "👨‍💻",
    gradient: "from-orange-400/20 to-yellow-500/20"
  },
  { 
    name: "Jessica Williams", 
    role: "Content Lead", 
    company: "MediaFlow",
    quote: "Game-changer for social media planning",
    avatar: "👩‍🎨",
    gradient: "from-pink-400/20 to-rose-500/20"
  }
];

const ScrollingRow = ({ items, type, direction, speed = 30 }: ScrollingRowProps) => {
  const duplicatedItems = [...items, ...items];
  
  return (
    <div className="relative h-24 overflow-hidden">
      <div 
        className={`flex gap-4 ${direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right'}`}
        style={{ 
          animationDuration: `${speed}s`,
          willChange: 'transform',
          transform: 'translateZ(0)'
        }}
      >
        {duplicatedItems.map((item, idx) => {
          // Render standard cards (AI suggestions, features, action items)
          if (type === 'standard' && 'text' in item) {
            return (
              <div
                key={idx}
                className={`
                  group relative
                  px-6 py-4
                  rounded-2xl
                  bg-white/12
                  backdrop-blur-md
                  border border-white/35
                  shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]
                  hover:bg-white/18
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
            );
          }
          
          // Render design example cards
          if (type === 'design' && 'projectName' in item) {
            return (
              <div
                key={idx}
                className={`
                  group relative
                  px-6 py-4
                  rounded-2xl
                  bg-white/12
                  backdrop-blur-md
                  border border-white/35
                  shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]
                  hover:bg-white/18
                  hover:border-white/40
                  hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.2)]
                  transition-all duration-300
                  min-w-fit
                  hover:scale-105
                  bg-gradient-to-r ${item.gradient}
                `}
              >
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-base font-semibold text-white whitespace-nowrap">
                      {item.projectName}
                    </span>
                  </div>
                  <span className="text-sm text-white/70">{item.category}</span>
                </div>
              </div>
            );
          }
          
          // Render testimonial cards
          if (type === 'testimonial' && 'quote' in item) {
            return (
              <div
                key={idx}
                className={`
                  group relative
                  px-6 py-4
                  rounded-2xl
                  bg-white/12
                  backdrop-blur-md
                  border border-white/35
                  shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]
                  hover:bg-white/18
                  hover:border-white/40
                  hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.2)]
                  transition-all duration-300
                  min-w-[400px]
                  hover:scale-105
                  bg-gradient-to-r ${item.gradient}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar Circle */}
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                    {item.avatar}
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-col items-start flex-1">
                    <div className="text-sm text-white/90 italic mb-1 truncate w-full">
                      "{item.quote}"
                    </div>
                    <div className="text-xs text-white/70">
                      {item.name}, {item.role} at {item.company}
                    </div>
                    <div className="text-xs mt-1">
                      ⭐⭐⭐⭐⭐
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          
          return null;
        })}
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
      className="relative w-full h-full flex flex-col justify-center p-12 space-y-5 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Interactive gradient overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              800px circle at ${mousePos.x}px ${mousePos.y}px,
              rgba(255, 255, 255, 0.08),
              transparent 35%,
              rgba(0, 0, 0, 0.5)
            )
          `
        }}
      />

      {/* Content rows */}
      <div className="relative z-10 space-y-5">
        <ScrollingRow items={aiSuggestions} type="standard" direction="right" speed={35} />
        <ScrollingRow items={designExamples} type="design" direction="left" speed={30} />
        <ScrollingRow items={actionPlanItems} type="standard" direction="right" speed={28} />
        <ScrollingRow items={testimonials} type="testimonial" direction="left" speed={32} />
        <ScrollingRow items={featureHighlights} type="standard" direction="right" speed={36} />
        <ScrollingRow items={aiSuggestions} type="standard" direction="left" speed={40} />
      </div>
    </div>
  );
};
