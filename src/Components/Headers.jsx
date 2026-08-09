const Headers = () => {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 rounded-xl" aria-label="Pixel Fusion home">
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-9 object-contain transition-transform duration-200 hover:scale-105"
          />
          <span className="text-base font-bold tracking-tight text-slate-900">
            Pixel<span className="text-emerald-600">Fusion</span>
          </span>
        </a>
      </div>
    </header>
  );
};

export default Headers;
