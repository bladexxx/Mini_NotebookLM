
// This declares the global variables from the CDN scripts.
declare const pdfjsLib: any;
declare const XLSX: any;

const extractTextFromTxt = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
};

const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText;
};

const extractTextFromXlsx = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        let fullText = '';
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          jsonData.forEach((row: any) => {
            fullText += (row as any[]).join(', ') + '\n';
          });
          fullText += '\n';
        });
        resolve(fullText);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};


export const processFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'txt':
    case 'md':
      return extractTextFromTxt(file);
    case 'pdf':
      return extractTextFromPdf(file);
    case 'xlsx':
      return extractTextFromXlsx(file);
    default:
      throw new Error(`Unsupported file type: .${extension}`);
  }
};