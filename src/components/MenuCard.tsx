import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MenuCardProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: string;
}

export const MenuCard: React.FC<MenuCardProps> = ({ title, icon: Icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="dy-card dy-card-hover flex flex-col items-center justify-center gap-4 active:scale-95 transition-all w-full aspect-square border-dy-gray-dark group"
    >
      <div className="p-4 bg-dy-black rounded-2xl group-hover:bg-dy-accent transition-colors">
        <Icon size={32} className="text-dy-white group-hover:text-dy-black transition-colors" />
      </div>
      <span className="text-[13px] font-black uppercase tracking-[0.2em] text-dy-gray-light group-hover:text-dy-accent transition-colors">{title}</span>
    </button>
  );
};
