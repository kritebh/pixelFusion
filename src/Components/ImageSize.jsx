import React from "react";

const ImageSize = ({ size, setSize }) => {
  const handleHeight = (e) => {
    setSize({ ...size, height: e.target.value });
  };

  const handleWidth = (e) => {
    setSize({ ...size, width: e.target.value });
  };

  return (
    <div className="w-full max-w-md flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="height" className="text-sm font-medium text-slate-700">
          Height
        </label>
        <input
          className="w-24 px-3 py-2 text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-shadow"
          type="number"
          name="height"
          id="height"
          value={size.height}
          onChange={handleHeight}
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="width" className="text-sm font-medium text-slate-700">
          Width
        </label>
        <input
          className="w-24 px-3 py-2 text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-shadow"
          type="number"
          name="width"
          id="width"
          value={size.width}
          onChange={handleWidth}
        />
      </div>
    </div>
  );
};

export default ImageSize;
