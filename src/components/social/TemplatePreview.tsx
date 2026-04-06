import type { SocialTemplateProps } from "@/lib/social-templates/types";

export const TemplatePreview = ({
  templateId,
  backgroundImageUrl,
  texts,
  logo,
  brandColors,
  format,
}: SocialTemplateProps) => {
  const aspectRatio = format === "1080x1920" ? "9/16" : "1/1";

  const bgStyle: React.CSSProperties = {
    aspectRatio,
    backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: backgroundImageUrl ? undefined : "#1a1a2e",
  };

  if (templateId === "quote-card") {
    return (
      <div className="relative w-full overflow-hidden rounded-lg" style={bgStyle}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative flex flex-col items-center justify-center h-full p-6 text-center gap-3">
          <p className="text-white text-sm font-semibold leading-snug">
            {texts.quote_text || "Your quote here"}
          </p>
          <p style={{ color: brandColors.accent }} className="text-xs font-medium">
            — {texts.attribution || "Attribution"}
          </p>
          {logo && (
            <img src={logo} alt="logo" className="absolute bottom-3 right-3 h-6 w-auto opacity-80" />
          )}
        </div>
      </div>
    );
  }

  if (templateId === "quick-tip") {
    return (
      <div className="relative w-full overflow-hidden rounded-lg" style={bgStyle}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative flex flex-col items-center justify-center h-full p-6 gap-3 text-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: brandColors.primary }}
          >
            {texts.tip_number || "1"}
          </div>
          <p className="text-white text-sm leading-snug">{texts.tip_text || "Your tip text here"}</p>
          <div
            className="absolute bottom-0 left-0 right-0 h-6"
            style={{ backgroundColor: brandColors.primary }}
          />
        </div>
      </div>
    );
  }

  if (templateId === "promo-cta") {
    return (
      <div className="relative w-full overflow-hidden rounded-lg" style={bgStyle}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative flex flex-col items-center justify-end h-full p-6 gap-3 text-center">
          <p className="text-white text-sm font-bold leading-snug">
            {texts.headline || "Your headline here"}
          </p>
          <button
            className="px-4 py-1.5 rounded text-xs font-semibold text-white"
            style={{ backgroundColor: brandColors.accent }}
          >
            {texts.cta_text || "Learn More"}
          </button>
          {logo && (
            <img src={logo} alt="logo" className="absolute top-3 right-3 h-5 w-auto opacity-80" />
          )}
        </div>
      </div>
    );
  }

  if (templateId === "testimonial") {
    return (
      <div className="relative w-full overflow-hidden rounded-lg" style={bgStyle}>
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative flex flex-col justify-center h-full p-6 gap-2">
          <span className="text-4xl font-serif leading-none" style={{ color: brandColors.accent }}>
            "
          </span>
          <p className="text-white text-xs italic leading-snug">
            {texts.testimonial_text || "Customer testimonial goes here"}
          </p>
          <div className="mt-1">
            <p className="text-white text-xs font-semibold">{texts.customer_name || "Customer Name"}</p>
            <p className="text-xs" style={{ color: brandColors.accent }}>
              {texts.customer_role || "Role / Company"}
            </p>
          </div>
          {logo && (
            <img src={logo} alt="logo" className="absolute bottom-3 right-3 h-5 w-auto opacity-80" />
          )}
        </div>
      </div>
    );
  }

  if (templateId === "behind-scenes") {
    return (
      <div className="relative w-full overflow-hidden rounded-lg" style={bgStyle}>
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3" style={{ backgroundColor: brandColors.primary }}>
          <p className="text-white text-xs leading-snug">
            {texts.caption_text || "Caption text here"}
          </p>
        </div>
      </div>
    );
  }

  // Fallback for unknown templateId
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center" style={bgStyle}>
      <p className="text-muted-foreground text-xs">Preview unavailable</p>
    </div>
  );
};
