import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="mt-16 py-8 border-t text-center text-gray-500 text-sm">
      <p>&copy; {currentYear} Nama Proyek Anda.</p>
      <p>
        Dibuat dengan Next.js, D3.js, Tailwind CSS, dan Shadcn/UI.
      </p>
      <p className="mt-1">
        Terinspirasi oleh{' '}
        <a
          href="https://holtzy.github.io/pacific-challenge/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Pacific Challenge
        </a>.
      </p>
    </footer>
  );
};
export default Footer;