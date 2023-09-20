import React from "react";

const OptionsSelect = ({handleOptions,outputFormat}) => {
  return (
    <div className="m-2">
      <label
        htmlFor="output"
        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
      >
        Select new format:
      </label>
      <select
        name="output"
        id="output"
        onChange={handleOptions}
        value={outputFormat}
        className="border border-gray-300 text-gray-900 rounded-lg
             focus:ring-green-400 focus:border-green-500 p-2.5 block w-full"
      >
        <option value="png">png</option>
        <option value="jpg">jpg</option>
        <option value="jpeg">jpeg</option>
        <option value="webp">webp</option>
        <option value="gif">gif</option>
        <option value="svg">svg</option>
      </select>
    </div>
  );
};

export default OptionsSelect;
