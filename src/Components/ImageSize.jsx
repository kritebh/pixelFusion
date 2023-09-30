import React from "react";

const ImageSize = ({ size, setSize }) => {

  const handleHeight = (e) => {
    setSize({ ...size, height: e.target.value });
  };

  const handleWidth = (e) => {
    setSize({ ...size, width: e.target.value });
  };

  return (
    <div>
      <label htmlFor="height">Height: </label>
      <input
        className="p-1 m-2 w-[80px] border border-gray-300 text-gray-900 rounded-lg"
        type="number"
        name="height"
        id="height"
        value={size.height}
        onChange={handleHeight}
      />
      <label htmlFor="width">Width: </label>
      <input
        className="p-1 m-2 w-[80px] border border-gray-300 text-gray-900 rounded-lg"
        type="number"
        name="width"
        id="width"
        value={size.width}
        onChange={handleWidth}
      />
    </div>
  );
};

export default ImageSize;
