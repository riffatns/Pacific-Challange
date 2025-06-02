import React from 'react';
import { ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="mt-16 py-8 border-t border-slate-200 text-center text-slate-600 text-sm">
      <p className="font-medium">&copy; {currentYear} Pacific Employment.</p>
      <p className="mt-2 leading-relaxed">
        Built with Next.js, D3.js, Tailwind CSS, and Shadcn/UI.
      </p>
      <p className="mt-2">
        <a 
          className="font-medium text-slate-800 hover:text-slate-900 transition-colors"
          href="#"
        >
          Pacific Challenge
        </a>
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <p className="text-xs text-slate-500">
          A project by riffatns
        </p>
        <a 
          href="https://github.com/riffatns/Pacific-Challange"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ExternalLink size={14} className="ml-1" />
        </a>
      </div>
    </footer>
  );
};
export default Footer;