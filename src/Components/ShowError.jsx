import React from "react";

const ShowError = ({ error }) => {
  return (
    <div
      className="w-full max-w-md px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
      role="alert"
    >
      {error}
    </div>
  );
};

export default ShowError;