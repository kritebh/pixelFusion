import React from "react";

const OptionsSelect = ({ handleOptions, outputFormat }) => {
  return (
    <div className="w-full max-w-md">
      <label
        htmlFor="output"
        className="block mb-2 text-sm font-medium text-slate-700"
      >
        Output format
      </label>
      <select
        name="output"
        id="output"
        onChange={handleOptions}
        value={outputFormat}
        className="w-full px-4 py-2.5 text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-shadow duration-200"
      >
        <option value="png">PNG</option>
        <option value="jpg">JPG</option>
        <option value="jpeg">JPEG</option>
        <option value="webp">WebP</option>
        <option value="gif">GIF</option>
        <option value="svg">SVG</option>
      </select>
      <p className="mt-2 text-xs text-slate-500">
        PNG & WebP support transparency. JPG/JPEG do not. SVG embeds a raster copy.
      </p>
    </div>
  );
};

export default OptionsSelect;
