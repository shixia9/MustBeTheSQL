/**
 * Client-side report export utilities.
 * Uses html2canvas for DOM capture and jsPDF for PDF generation.
 * Mirrors DB-GPT's client-side export approach.
 */

let _html2canvas: any = null;
let _jsPDF: any = null;

async function getHtml2Canvas() {
  if (_html2canvas) return _html2canvas;
  _html2canvas = (await import('html2canvas')).default;
  return _html2canvas;
}

async function getJsPDF() {
  if (_jsPDF) return _jsPDF;
  const mod = await import('jspdf');
  _jsPDF = mod.jsPDF || mod.default;
  return _jsPDF;
}

/**
 * Download a single chart element as PNG.
 */
export async function downloadChartAsPng(element: HTMLElement, filename: string): Promise<void> {
  try {
    const html2canvas = await getHtml2Canvas();
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const link = document.createElement('a');
    link.download = `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    console.error('Failed to export chart as PNG:', e);
  }
}

/**
 * Download a full dashboard element as PNG.
 */
export async function downloadDashboardAsPng(element: HTMLElement, filename: string): Promise<void> {
  return downloadChartAsPng(element, filename);
}

/**
 * Download a full dashboard element as PDF.
 * Uses html2canvas to rasterize the DOM, then embeds the image in a PDF via jsPDF.
 */
export async function downloadDashboardAsPdf(element: HTMLElement, filename: string): Promise<void> {
  try {
    const html2canvas = await getHtml2Canvas();
    const jsPDF = await getJsPDF();

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF(
      imgHeight > imgWidth ? 'portrait' : 'landscape',
      'mm',
      'a4'
    );
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`${filename.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  } catch (e) {
    console.error('Failed to export dashboard as PDF:', e);
  }
}

/**
 * Download full page as PDF using browser print.
 * Falls back gracefully if jsPDF is not available.
 */
export function printPage(): void {
  window.print();
}
