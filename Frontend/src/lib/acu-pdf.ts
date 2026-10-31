// Browser-only shared A4 composition for preview, PDF and print.
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import letterhead from "@/assets/bgs-letterhead-new.jpg.asset.json";

async function loadLetterhead(url?: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url || letterhead.url;
  await image.decode();
  return image;
}

// Self-contained page typography so cached site styles can never shrink the text.
// Capture width 520px maps to 174mm on A4, so 15px body text prints at about 14pt.
const PAGE_CSS = `
.acu-page-host{position:fixed!important;left:-10000px!important;top:0!important;width:520px!important;pointer-events:none}
.acu-page-host .acu-page{width:520px!important;max-width:none!important;margin:0!important;padding:0!important;background:transparent!important;color:#1F2937!important;font-family:'Source Serif 4',Georgia,'Times New Roman',serif!important;font-size:15px!important;line-height:1.6!important;letter-spacing:0!important;overflow-wrap:anywhere}
.acu-page-host .acu-page h2{font-family:'Libre Baskerville',Georgia,serif!important;font-weight:700!important;font-size:22px!important;line-height:1.3!important;color:#6D1733!important;text-align:center!important;margin:0 0 12px!important;padding:0 0 8px!important;border-bottom:2px solid #D4A017!important}
.acu-page-host .acu-page h2+p i{display:block;color:#6B7280!important;text-align:center;font-size:14px!important;line-height:1.5!important}
.acu-page-host .acu-page h3{font-family:'Libre Baskerville',Georgia,serif!important;font-weight:700!important;font-size:17px!important;line-height:1.35!important;color:#8B1E3F!important;margin:16px 0 6px!important}
.acu-page-host .acu-page p{font-size:15px!important;margin:0 0 10px!important;text-align:justify}
.acu-page-host .acu-page ul{padding-left:22px!important;margin:0 0 10px!important}
.acu-page-host .acu-page li{font-size:15px!important;line-height:1.5!important;margin:0 0 4px!important}
.acu-page-host .acu-page li::marker{color:#D4A017}
.acu-page-host .acu-page figure{width:160px!important;margin:0!important}
.acu-page-host .acu-page img{max-width:100%;height:120px!important}
.acu-page-host .acu-page figcaption{font-size:11px!important}
.acu-page-host .acu-page table{width:100%!important;border-collapse:collapse!important;margin:0 0 14px!important;font-size:12px!important}
.acu-page-host .acu-page th,.acu-page-host .acu-page td{border:1px solid #D1D5DB!important;padding:4px 6px!important;text-align:left!important;vertical-align:top!important;line-height:1.4!important;color:#1F2937!important;background:transparent!important}
.acu-page-host .acu-page th{background:#F5F5F5!important;font-weight:700!important;width:38%}
.acu-page-host .acu-page h4{font-size:14px!important;color:#6D1733!important;margin:14px 0 6px!important}
`;

async function composePages(el: HTMLElement, withLetterhead: boolean, letterheadUrl?: string) {
  const holder = document.createElement("div");
  holder.className = "acu-page-host";
  const style = document.createElement("style");
  style.textContent = PAGE_CSS;
  const source = el.cloneNode(true) as HTMLElement;
  source.removeAttribute("id");
  source.hidden = false;
  source.className = "acu-page";
  holder.append(style, source);
  document.body.append(holder);
  try {
    await document.fonts.ready;
    await Promise.all(Array.from(source.querySelectorAll("img")).map(image => image.decode().catch(() => undefined)));
    const canvas = await html2canvas(source, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
    const background: HTMLImageElement | null = withLetterhead ? await loadLetterhead(letterheadUrl).catch(() => null) : null;
    const width = 174, top = background ? 50 : 20, bottom = background ? 34 : 20;
    const pixelsPerMm = canvas.width / width;
    const capacity = Math.floor((297 - top - bottom) * pixelsPerMm);
    const bounds = source.getBoundingClientRect(), scaleY = canvas.height / bounds.height;
    const protectedBlocks = Array.from(source.querySelectorAll("figure,h2,h3")).map(block => {
      const rect = block.getBoundingClientRect();
      const next = block.matches("h2,h3") ? block.nextElementSibling?.getBoundingClientRect() : null;
      return { start: Math.floor((rect.top - bounds.top) * scaleY), end: Math.ceil(((next ? Math.min(next.bottom, next.top + 40) : rect.bottom) - bounds.top) * scaleY) };
    });
    const last = source.lastElementChild?.getBoundingClientRect();
    const contentHeight = last ? Math.min(canvas.height, Math.ceil((last.bottom - bounds.top + 4) * scaleY)) : canvas.height;
    const endings = Array.from(source.querySelectorAll("p,li,figure")).map(block => Math.ceil((block.getBoundingClientRect().bottom - bounds.top + 2) * scaleY));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the article.");
    const pages: HTMLCanvasElement[] = [];
    let start = 0;
    while (start < contentHeight) {
      let end = Math.min(start + capacity, contentHeight);
      if (end < contentHeight) {
        const paragraphEnd = endings.filter(value => value > start + capacity * .5 && value <= end).at(-1);
        if (paragraphEnd) end = paragraphEnd;
        const scanStart = Math.max(start + Math.floor((end - start) * .75), end - Math.floor(24 * pixelsPerMm));
        const rows = context.getImageData(0, scanStart, canvas.width, end - scanStart).data;
        for (let y = end - scanStart - 1; y >= 0; y--) {
          let blank = true;
          for (let x = 0; x < canvas.width; x++) {
            const pixel = (y * canvas.width + x) * 4;
            if ((rows[pixel + 3] ?? 0) > 20 && Math.min(rows[pixel] ?? 255, rows[pixel + 1] ?? 255, rows[pixel + 2] ?? 255) < 210) { blank = false; break; }
          }
          if (blank) { end = scanStart + y + 1; break; }
        }
      }
      for (const block of protectedBlocks) {
        if (block.start > start + capacity * .5 && block.start < end && block.end > end && block.end - block.start < capacity) end = block.start;
      }
      const page = document.createElement("canvas");
      page.width = Math.round(210 * pixelsPerMm); page.height = Math.round(297 * pixelsPerMm);
      const ctx = page.getContext("2d");
      if (!ctx) throw new Error("Could not prepare the page.");
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "white";
      ctx.fillRect(0, 0, page.width, page.height);
      if (background) ctx.drawImage(background, 0, 0, page.width, page.height);
      ctx.drawImage(canvas, 0, start, canvas.width, end - start, Math.round(18 * pixelsPerMm), Math.round(top * pixelsPerMm), canvas.width, end - start);
      pages.push(page); start = end;
    }
    return pages;
  } finally { holder.remove(); }
}

export function installAcuPdf() {
  const w = window as any;
  if (w.__ACU_PDF) return;
  w.__ACU_PDF = {
    async renderEl(el: HTMLElement, target: HTMLElement) {
      const pages = await composePages(el, false);
      if (!target.isConnected) return;
      target.replaceChildren(...pages.map((canvas, index) => {
        const image = document.createElement("img");
        image.src = canvas.toDataURL("image/png");
        image.alt = `Events Organized article — page ${index + 1}`;
        image.className = "event-letterhead-page";
        return image;
      }));
      el.hidden = true;
    },
    async toPdf(title: string, el: HTMLElement, options?: { eventOrganize?: boolean; letterhead?: string }) {
      const pages = await composePages(el, true, options?.letterhead);
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      pages.forEach((page, index) => {
        if (index) pdf.addPage();
        pdf.addImage(page.toDataURL("image/jpeg", .94), "JPEG", 0, 0, 210, 297);
      });
      pdf.save((title.replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "article") + ".pdf");
    },
    async printEl(el: HTMLElement, title: string, options?: { eventOrganize?: boolean; letterhead?: string }) {
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) { alert("Please allow pop-ups to print this article."); return; }
      try {
        const pages = await composePages(el, true, options?.letterhead);
        win.document.title = title;
        const style = win.document.createElement("style");
        style.textContent = "@page{size:A4;margin:0}html,body{margin:0;padding:0}.print-page{display:block;width:210mm;height:297mm;break-after:page}.print-page:last-child{break-after:auto}@media screen{.print-page{width:100%;height:auto;max-width:794px;margin:auto}}";
        win.document.head.append(style);
        const images = pages.map((page, index) => {
          const image = win.document.createElement("img"); image.className = "print-page";
          image.alt = `Article page ${index + 1}`; image.src = page.toDataURL("image/png");
          win.document.body.append(image); return image;
        });
        await Promise.all(images.map(image => image.decode()));
        win.focus(); win.print();
      } catch (error) {
        // Fallback: print the plain article text and images.
        win.document.title = title;
        win.document.body.innerHTML = `<style>@page{size:A4;margin:18mm}body{font-family:Georgia,serif;font-size:22px;line-height:1.6}img{max-width:280px;margin:6px}</style>${el.innerHTML}`;
        win.focus(); win.print();
      }
    },
  };
}
