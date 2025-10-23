import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Users, Target, Calendar, Palette, MessageSquare, BarChart3, FolderOpen, Link2, Mail } from 'lucide-react';

interface CarouselItem {
  icon: React.ReactNode;
  text: string;
  subtext?: string;
  imageUrl?: string;
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
  { 
    imageUrl: "https://agencyapp-assets.upcity.com/user/150773/avatar/37549160058ddf7f181779382b9c15aa.jpeg",
    icon: "⭐",
    text: "Garrett is able to take our feedback and create a solid marketing strategy that shows results", 
    subtext: "Teresa H." 
  },
  { 
    imageUrl: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/4f4633ba-f4ec-44f1-a135-9c6e522cd245/23ca0462e6872db5789072c6711c6186-1-.jpg",
    icon: "⭐",
    text: "His expertise was instrumental in scaling Wishwell and developing an intentional strategic marketing approach", 
    subtext: "Verenice H." 
  },
  { 
    imageUrl: "https://m.media-amazon.com/images/S/amzn-author-media-prod/5hn740nl9nh58fn8hja8t3027g.jpg",
    icon: "⭐",
    text: "Garrett took existing direction and suggested impactful improvements in marketing and website design", 
    subtext: "Gary H." 
  },
  { 
    imageUrl: "https://agencyapp-assets.upcity.com/user/38838/avatar/cde9de7f0bbe551d23cd3c2f64df272b.jpeg",
    icon: "⭐",
    text: "Garrett has given great recommendations on digital solutions. I look forward to a long working partnership", 
    subtext: "Tabor L." 
  },
  { 
    imageUrl: "https://agencyapp-assets.upcity.com/user/38616/avatar/7e9de59ec5d07dd504a41467aaa8c607.jpg",
    icon: "⭐",
    text: "Spearlance made it easy, took my fears away, and I actually enjoyed seeing it transform to reality", 
    subtext: "Debra P." 
  },
  { 
    imageUrl: "https://agencyapp-assets.upcity.com/user/41703/avatar/b585bb935a28fee75cf1450829da6eae.jpeg",
    icon: "⭐",
    text: "Their ability to problem-solve and combine design elements that enhance engagement is impressive", 
    subtext: "Patrick M." 
  },
  {
    imageUrl: "https://lirp.cdn-website.com/eb7a64e0/dms3rep/multi/opt/64da7339c9e310aeb8ec6b85_Inc.+5000+Color+Medallion+Logo-240w.webp",
    icon: "🏆",
    text: "Clients Featured on Inc. 5000",
    subtext: "8x Achievement"
  }
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
  // Shuffle utility function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [shuffledItems] = useState(() => shuffleArray(items));
  const duplicatedItems = [...shuffledItems, ...shuffledItems, ...shuffledItems];
  
  return (
    <div 
      className="flex flex-col items-center justify-center relative h-full py-6"
      style={{ 
        transform: `perspective(1200px) rotateY(${tiltDirection === 'left' ? '-1deg' : '1deg'})`,
        transformOrigin: 'center center'
      }}
    >
      {/* Header - Fixed */}
      <div className="text-center px-4 md:px-8 mb-4 md:mb-6 z-20 relative">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">
          {heading}
        </h2>
        <p className="text-sm md:text-base lg:text-lg text-white/70 max-w-2xl mx-auto line-clamp-3">
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
            {item.imageUrl ? (
              <img 
                src={item.imageUrl} 
                alt={item.subtext || "Customer"} 
                className="w-10 h-10 rounded-full object-cover border-2 border-white/20 bg-white/10"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : typeof item.icon === 'string' ? (
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

    </div>
  );
};
