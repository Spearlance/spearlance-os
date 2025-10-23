import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Users, Target, Calendar, Palette, MessageSquare, BarChart3, FolderOpen, Link2, Mail } from 'lucide-react';

interface CarouselItem {
  icon: React.ReactNode;
  text: string;
  subtext?: string;
}

interface ContentRow {
  heading: string;
  subheading: string;
  items: CarouselItem[];
  direction: 'left' | 'right';
  speed: number;
  tiltDirection: 'left' | 'right';
}

// Row 1: AI Action Plan
const aiPlanItems: CarouselItem[] = [
  { icon: <Target className="w-5 h-5" />, text: "Brand Strategy Analysis" },
  { icon: <BarChart3 className="w-5 h-5" />, text: "Marketing Channel Recommendations" },
  { icon: <Calendar className="w-5 h-5" />, text: "Content Calendar Generation" },
  { icon: <Palette className="w-5 h-5" />, text: "Visual Identity Development" },
  { icon: <TrendingUp className="w-5 h-5" />, text: "Growth Metrics Tracking" },
  { icon: <Sparkles className="w-5 h-5" />, text: "Competitive Insights" },
  { icon: <Target className="w-5 h-5" />, text: "Launch Roadmap Creation" },
  { icon: <MessageSquare className="w-5 h-5" />, text: "Social Media Automation" },
];

// Row 2: Platform Features
const platformFeatures: CarouselItem[] = [
  { icon: <Sparkles className="w-5 h-5" />, text: "AI Content Generation" },
  { icon: <Calendar className="w-5 h-5" />, text: "Campaign Calendar" },
  { icon: <Users className="w-5 h-5" />, text: "Client Portal" },
  { icon: <BarChart3 className="w-5 h-5" />, text: "Analytics Dashboard" },
  { icon: <Palette className="w-5 h-5" />, text: "Brand Guide Builder" },
  { icon: <MessageSquare className="w-5 h-5" />, text: "Team Collaboration" },
  { icon: <FolderOpen className="w-5 h-5" />, text: "Asset Management" },
  { icon: <Link2 className="w-5 h-5" />, text: "Integration Hub" },
  { icon: <Mail className="w-5 h-5" />, text: "Email Automation" },
  { icon: <Target className="w-5 h-5" />, text: "Goal Tracking" },
];

// Row 3: Client Results
const clientResults: CarouselItem[] = [
  { icon: "⭐", text: "Increased client retention by 40%", subtext: "Sarah M., Agency Owner" },
  { icon: "💼", text: "Case Study: 10x Social Engagement" },
  { icon: "🎨", text: "Portfolio: SaaS Rebrand Success" },
  { icon: "⭐", text: "Saved 15 hours per week on planning", subtext: "Marcus R., Freelancer" },
  { icon: "📈", text: "Case Study: $2M Revenue Growth" },
  { icon: "🎨", text: "Portfolio: E-commerce Design System" },
  { icon: "⭐", text: "Finally, a tool that gets brand strategy", subtext: "Emily K., CMO" },
  { icon: "💼", text: "Case Study: Complete Brand Transformation" },
];

const contentRows: ContentRow[] = [
  {
    heading: "Turn Every Day Into a Clear Marketing Plan",
    subheading: "Our AI learns your business and gives your team simple, personalized tasks each day so marketing finally feels focused, not random.",
    items: aiPlanItems,
    direction: 'left',
    speed: 40,
    tiltDirection: 'left'
  },
  {
    heading: "One Platform to Run Every Part of Your Marketing",
    subheading: "From planning to publishing, SpearlanceOS keeps your website, content, ads, and analytics organized in one place your whole team can actually use.",
    items: platformFeatures,
    direction: 'right',
    speed: 35,
    tiltDirection: 'right'
  },
  {
    heading: "Proven by Real Teams, Not Agencies",
    subheading: "See how businesses of all sizes are using Spearlance to stay consistent, grow faster, and save hours every week.",
    items: clientResults,
    direction: 'left',
    speed: 38,
    tiltDirection: 'left'
  }
];

interface ContentRowProps extends ContentRow {}

const ContentRow = ({ heading, subheading, items, direction, speed, tiltDirection }: ContentRowProps) => {
  const duplicatedItems = [...items, ...items, ...items];
  
  return (
    <div 
      className="flex flex-col items-center justify-center relative h-full"
      style={{ 
        transform: `perspective(1200px) rotateY(${tiltDirection === 'left' ? '-1deg' : '1deg'})`,
        transformOrigin: 'center center'
      }}
    >
      {/* Header - Fixed */}
      <div className="text-center px-8 mb-6 z-20 relative">
        <h2 className="text-4xl font-bold text-white mb-3">
          {heading}
        </h2>
        <p className="text-lg text-white/70 max-w-2xl mx-auto">
          {subheading}
        </p>
      </div>
      
      {/* Scrolling Pills */}
      <div className="relative w-full overflow-hidden py-2">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-48 bg-gradient-to-r from-gray-950 via-gray-950/80 to-transparent z-10 pointer-events-none" />
        
        <div 
          className={`flex gap-4 ${direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right'}`}
          style={{ 
            animationDuration: `${speed}s`,
            transform: 'translateZ(0)',
            willChange: 'transform'
          }}
        >
          {duplicatedItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/15 border border-white/30 backdrop-blur-md hover:bg-white/20 transition-all duration-300 whitespace-nowrap flex-shrink-0"
            >
              {typeof item.icon === 'string' ? (
                <span className="text-2xl">{item.icon}</span>
              ) : (
                <div className="text-white">{item.icon}</div>
              )}
              <div className="flex flex-col items-start">
                <span className="text-base font-medium text-white">{item.text}</span>
                {item.subtext && (
                  <span className="text-sm text-white/60">{item.subtext}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-gray-950 via-gray-950/80 to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
};

export const AnimatedCarousel = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Auto-advance slides every 9 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % contentRows.length);
    }, 9000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="relative w-full h-full flex flex-col p-0 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Interactive gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
        style={{
          background: `
            radial-gradient(
              900px circle at ${mousePos.x}px ${mousePos.y}px,
              rgba(255, 255, 255, 0.06),
              transparent 40%,
              rgba(0, 0, 0, 0.6)
            )
          `,
        }}
      />

      {/* Single slide with fade transition */}
      <div className="relative z-10 h-full">
        {contentRows.map((row, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ContentRow {...row} />
          </div>
        ))}
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {contentRows.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white w-8 h-2' 
                : 'bg-white/30 hover:bg-white/50 w-2 h-2'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
