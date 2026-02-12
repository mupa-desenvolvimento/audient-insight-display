
import { ElementType } from "react";

export type Slide = {
  id: number;
  layout: string;
  title: string;
  subtitle: string;
  description: string;
  icon?: ElementType;
  image?: string | null;
  images?: string[];
  video?: string;
  points?: string[];
  features?: { icon: ElementType; text: string; desc?: string }[];
  items?: { title: string; desc: string; icon?: ElementType }[];
  stats?: { label: string; value: string }[];
  benefits?: string[];
  color?: string;
  cta?: string;
  comparison?: {
    left: { label: string; image: string; color?: string };
    right: { label: string; image: string; color?: string };
  };
  reasons?: { title: string; desc: string }[];
  planDetails?: { title: string; items: string[] }[];
  planTheme?: "zinc" | "green" | "blue" | "purple";
  
  // New fields for Assaí presentation
  stats?: { label: string; value: string; icon?: ElementType }[];
  chartData?: { name: string; value: number }[];
  chartType?: "bar" | "line" | "pie";
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
  };
  leftTitle?: string;
  leftPoints?: string[];
  rightTitle?: string;
  rightPoints?: string[];
};
