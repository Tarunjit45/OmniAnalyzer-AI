
/**
 * Converts a File object to a base64 encoded string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Gets the readable mime type or a fallback that Gemini supports.
 * Gemini 3 Pro supports common document, image, and text formats.
 */
export const getSafeMimeType = (file: File): string => {
  const type = file.type;
  
  // If the browser detected a type and it's not the generic octet-stream, use it
  if (type && type !== 'application/octet-stream') return type;
  
  // Manual mapping for common extensions that might be missed
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'html': case 'htm': return 'text/html';
    case 'txt': case 'md': case 'json': return 'text/plain';
    case 'js': return 'application/javascript';
    case 'ts': return 'application/x-typescript';
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    default: 
      // Fallback for unknown files to text/plain. 
      // If it's truly a binary file like an .exe, Gemini prefers 
      // text-based files for content analysis, but if we must send binary,
      // text/plain is safer for the API's input validation than octet-stream 
      // when we want content inspection.
      return 'text/plain'; 
  }
};

/**
 * Human readable file size
 */
export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
