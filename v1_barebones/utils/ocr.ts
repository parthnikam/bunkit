import { createWorker } from 'tesseract.js';

async function extractText(imagePath: string): Promise<string> {
  // 1. Initialize the worker with English language data
  const worker = await createWorker('eng');
  
  // 2. Recognize text from the image path (URL, local path, or Buffer)
  const { data: { text } } = await worker.recognize(imagePath);
  
  // 3. Clean up the worker memory
  await worker.terminate();
  
  return text;
}

// Example Execution
const path = "C:/Users/108pa/Parth/Backup/illya's reading list.jpg";

extractText(path)
  .then(text => console.log('--- Extracted Text ---\n', text))
  .catch(error => console.error('OCR Error:', error));
