export interface SocialTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  textSlots: string[];
  textSlotLabels: Record<string, string>;
  format: ('1080x1080' | '1080x1920')[];
}

export interface SocialTemplateProps {
  templateId: string;
  backgroundImageUrl: string;
  texts: Record<string, string>;
  logo: string;
  brandColors: { primary: string; secondary: string; accent: string };
  format: '1080x1080' | '1080x1920';
}
