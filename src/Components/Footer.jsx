import { GitHubIcon } from "./icons";

const Footer = () => {
  return (
    <footer className="mt-auto w-full border-t border-slate-200/80 bg-white/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:px-6">
        <span>
          Made with ❤️ by{" "}
          <a
            href="https://github.com/kritebh"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-700 underline underline-offset-2 transition-colors hover:text-emerald-600"
          >
            kritebh
          </a>
        </span>
        <a
          href="https://github.com/kritebh/pixelFusion"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg font-medium text-slate-700 transition-colors hover:text-emerald-600"
        >
          <GitHubIcon />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
