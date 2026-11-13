import JsBarcode from "jsbarcode";
import Swal from "sweetalert2";

const escapeHtml = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

// Draw a Code128 barcode into an <svg>
export const drawBarcode = (svg, value, height = 46) => {
    try {
        JsBarcode(svg, value, {
            format: "CODE128",
            displayValue: false,
            height,
            width: 1.6,
            margin: 0,
            background: "transparent",
            lineColor: "#101828"
        });
    } catch (err) {
        console.error("Barcode render failed:", value, err);
    }
};

// Print labels: item name (bold) + barcode + code
// labels: [{ Barcode, ItemName }]
export const printBarcodeLabels = (labels, title = "Labels") => {
    const printable = (labels || []).filter(l => l.Barcode);

    if (!printable.length) {
        Swal.fire("Nothing to print", "No generated barcodes to print.", "info");
        return;
    }

    const html = printable.map(l => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        drawBarcode(svg, l.Barcode, 50);
        return `
            <div class="label">
                <div class="name">${escapeHtml(l.ItemName || "")}</div>
                ${svg.outerHTML}
                <div class="code">${escapeHtml(l.Barcode)}</div>
            </div>`;
    }).join("");

    const win = window.open("", "_blank", "width=1000,height=760");
    if (!win) {
        Swal.fire("Popup blocked", "Please allow popups to print labels.", "warning");
        return;
    }

    win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 12px; color: #101828; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .label { border: 1px dashed #98a2b3; border-radius: 6px; padding: 8px 10px; page-break-inside: avoid; }
            .name { font-weight: 700; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            svg { width: 100%; height: 50px; display: block; margin-top: 4px; }
            .code { font-family: monospace; font-weight: 700; font-size: 13px; text-align: center; letter-spacing: 1.5px; margin-top: 2px; }
            @page { margin: 10mm; }
        </style></head><body><div class="grid">${html}</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
};