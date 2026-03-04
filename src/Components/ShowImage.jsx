import React from "react";

const ShowImage = ({ fileInfo }) => {
  if (!fileInfo) return null;
  const { filePath, fileName, width, height } = fileInfo;
  return (
    <div className="w-full max-w-md mt-2 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
        Preview
      </p>
      <p className="text-slate-600 text-sm mb-3">
        {fileName} <br /> {width} × {height} px
      </p>
      <div className="flex justify-center flex-col items-center">
        <img
          src={filePath}
          alt={`Preview: ${fileName}`}
          className="rounded-lg max-w-[12rem] w-full h-auto object-contain border border-slate-100"
        />
      </div>
    </div>
  );
};

export default ShowImage;
