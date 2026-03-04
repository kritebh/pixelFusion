const Headers = () => {
  return (
    <header className="w-full bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
        <img
          src="/logo.png"
          alt="Pixel Fusion Logo"
          className="w-12 h-12 object-contain transition-transform duration-200 hover:scale-105"
        />
      </div>
    </header>
  );
};

export default Headers;