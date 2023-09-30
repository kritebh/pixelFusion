export default function convertImage(fileInfo, outFormat, size) {
  let canvas = document.createElement("canvas");

  let ctx = canvas.getContext("2d");
  let image = new Image();
  image.src = fileInfo.filePath;
  image.onload = () => {
    let maxWidth = size?.width;
    let maxHeight = size?.height; 
    let width = image.width;
    let height = image.height;
  
    // Calculate the new dimensions to maintain the aspect ratio
    if (width > maxWidth) {
      height *= maxWidth / width;
      width = maxWidth;
    }
  
    if (height > maxHeight) {
      width *= maxHeight / height;
      height = maxHeight;
    }
  
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(image, 0, 0,width,height);

    let outputUrl = "";
    if (outFormat === "svg") {
      outputUrl = handleSvg(canvas, fileInfo.filePath);
    } else {
      outputUrl = canvas.toDataURL(`image/${outFormat}`);
    }
    let name = fileInfo.fileName.split(".")[0];

    outputImage(outputUrl, name, outFormat);
  };
}

const handleSvg = (canvas) => {
  const serializer = new XMLSerializer();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", canvas.width);
  svg.setAttribute("height", canvas.height);

  const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
  img.setAttribute("x", "0");
  img.setAttribute("y", "0");
  img.setAttribute("width", canvas.width);
  img.setAttribute("height", canvas.height);
  img.setAttribute("href", canvas.toDataURL("image/png"));

  svg.appendChild(img);

  const svgString = serializer.serializeToString(svg);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  return url;
};

const outputImage = (outputUrl, name, outFormat) => {
  let link = document.createElement("a");
  link.download = `${name}.${outFormat}`;
  link.href = outputUrl;
  link.click();
};
