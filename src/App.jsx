import { useState, useEffect, useRef, useCallback } from "react";
import convertImage from "./utils/convert";
import Headers from "./Components/Headers";
import Footer from "./Components/Footer";
import ShowImage from "./Components/ShowImage";
import OptionsSelect from "./Components/OptionsSelect";
import ShowError from "./Components/ShowError";
import ImageSize from "./Components/ImageSize";

const MAX_DIMENSION = 4096;

function App() {
  const [fileInfo, setFileInfo] = useState(null);
  const [outputFormat, setOutputFormat] = useState("png");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [largeImageWarning, setLargeImageWarning] = useState(false);
  const [size, setSize] = useState({ height: 0, width: 0 });
  const fileInputRef = useRef(null);
  const successTimeoutRef = useRef(null);

  const revokeFileUrl = useCallback((info) => {
    if (info?.filePath) {
      try {
        URL.revokeObjectURL(info.filePath);
      } catch (_) {}
    }
  }, []);

  const clearImage = useCallback(() => {
    if (fileInfo) {
      revokeFileUrl(fileInfo);
      setFileInfo(null);
      setSize({ height: 0, width: 0 });
      setError("");
      setLargeImageWarning(false);
      setSuccessMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [fileInfo, revokeFileUrl]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type.split("/")[0] !== "image") {
      setError("Only image files are allowed.");
      return;
    }
    setError("");
    setSuccessMessage("");
    revokeFileUrl(fileInfo);

    const fileName = file.name;
    const filePath = URL.createObjectURL(file);
    const img = new Image();
    img.src = filePath;
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setLargeImageWarning(w > MAX_DIMENSION || h > MAX_DIMENSION);
      setFileInfo({
        width: w,
        height: h,
        filePath,
        fileName,
      });
      setSize({ width: w, height: h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(filePath);
      setError("Could not load image.");
    };
  };

  const handleOptions = (e) => {
    setOutputFormat(e.target.value);
  };

  const handleConvert = useCallback(() => {
    if (!fileInfo) return;
    setSuccessMessage("");
    convertImage(fileInfo, outputFormat, size, () => {
      setSuccessMessage("Download started.");
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(""), 4000);
    });
  }, [fileInfo, outputFormat, size]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Enter" || !fileInfo) return;
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      e.preventDefault();
      handleConvert();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fileInfo, handleConvert]);

  useEffect(() => {
    return () => {
      revokeFileUrl(fileInfo);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, [fileInfo, revokeFileUrl]);

  return (
    <>
      <Headers />
      <main className="min-h-[calc(100vh-4.5rem)] bg-slate-50 flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <div className="w-full p-6 border-2 border-dashed border-slate-300 rounded-xl bg-white/80 hover:border-green-400 hover:bg-green-50/50 transition-colors duration-200 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700 file:transition-colors file:cursor-pointer cursor-pointer"
              onChange={handleFile}
            />
          </div>

          {fileInfo && (
            <button
              type="button"
              onClick={clearImage}
              className="w-full py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
            >
              Clear / change image
            </button>
          )}

          {error && <ShowError error={error} />}
          {largeImageWarning && (
            <div
              className="w-full max-w-md px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm"
              role="status"
            >
              Very large image. Conversion may be slow or fail in some browsers.
            </div>
          )}
          {successMessage && (
            <div
              className="w-full max-w-md px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium"
              role="status"
            >
              {successMessage}
            </div>
          )}

          <OptionsSelect
            handleOptions={handleOptions}
            outputFormat={outputFormat}
          />
          {fileInfo && <ImageSize size={size} setSize={setSize} />}

          {fileInfo && (
            <div className="w-full max-w-xs flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConvert}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-xl font-medium shadow-md hover:bg-green-700 hover:shadow-lg active:scale-[0.98] transition-all duration-200"
              >
                Convert <span className="opacity-80 text-xs">(Enter)</span>
              </button>
            </div>
          )}

          {fileInfo && <ShowImage fileInfo={fileInfo} />}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default App;
