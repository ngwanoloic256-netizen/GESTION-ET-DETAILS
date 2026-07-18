// Safe mock for formdata-polyfill in the browser environment
const g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {} as any;
export const FormData = g.FormData || class {};
export function formDataToBlob(form: any) {
  return new Blob();
}
