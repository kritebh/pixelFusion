import React from "react";

const ShowImage = ({ fileInfo }) => {
  
  return (
    <div>
      <img
        src={fileInfo?.filePath}
        alt=""
        className="rounded-lg mt-6 w-20 h-24"
      />
    </div>
  );
};

export default ShowImage;
