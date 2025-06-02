import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="mt-16 py-8 border-t border-slate-200 text-center text-slate-600 text-sm">
      <p className="font-medium">&copy; {currentYear} Pacific Employment.</p>
      <p className="mt-2 leading-relaxed">
        Built with Next.js, D3.js, Tailwind CSS, and Shadcn/UI.
      </p>      <p className="mt-2">
        <a 
          className="font-medium text-slate-800 hover:text-slate-900 transition-colors"
          href="#"
        >
          Pacific Challenge
        </a>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        A project by riffatns
      </p>
    </footer>
  );
};
export default Footer;