import { useState } from "react";
import convertImage from "./utils/convert";
import Headers from "./Components/Headers";
import ShowImage from "./Components/ShowImage";
import OptionsSelect from "./Components/OptionsSelect";
import ShowError from "./Components/ShowError";
import ImageSize from "./Components/ImageSize";
function App() {
  const [fileInfo, setFileInfo] = useState(null);
  const [outputFormat, setOutputFormat] = useState("png");
  const [error, setError] = useState("");
  const [size, setSize] = useState({
    height: 0,
    width: 0,
  });

  const handleFile = (e) => {
    if (e.target.files[0]?.type.split("/")[0] !== "image") {
      setError("Only image file is allowed");
      return;
    } else {
      setError("");
    }
    let fileName = e.target.files[0]?.name;
    let filePath = URL.createObjectURL(e.target.files[0]);
    let img = new Image();
    img.src = filePath;
    img.onload = () => {
      setFileInfo({
        width: img.naturalWidth,
        height: img.naturalHeight,
        filePath: filePath,
        fileName: fileName,
      });
      let imgSize = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      setSize(imgSize);
    };
  };

  const handleOptions = (e) => {
    setOutputFormat(e.target.value);
  };

  return (
    <>
      <Headers />
      <div className="flex items-center flex-col h-screen">
        <div className="p-4 border-4 border-dashed my-2 mt-6">
          <input
            type="file"
            className="
          block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-green-50 file:text-green-700
          hover:file:bg-green-100
          m-2
          "
            onChange={handleFile}
          />
        </div>

        {error && <ShowError error={error} />}

        <OptionsSelect
          handleOptions={handleOptions}
          outputFormat={outputFormat}
        />
        {fileInfo && <ImageSize size={size} setSize={setSize} />}

        {fileInfo && (
          <button
            onClick={() => convertImage(fileInfo, outputFormat, size)}
            className={`bg-green-700 text-white py-2 px-4 my-2 rounded-md`}
          >
            Convert
          </button>
        )}

        {fileInfo && <ShowImage fileInfo={fileInfo} />}
      </div>
    </>
  );
}

export default App;
