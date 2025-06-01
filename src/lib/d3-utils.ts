// src/lib/d3-utils.ts
import * as d3 from 'd3';

// Fungsi untuk format angka sumbu (misal 10k, 1M)
export const formatSIAxis = (value: d3.NumberValue): string => {
  const num = Number(value);
  if (num === 0) return "0";
  // Hindari format desimal untuk angka kecil di sumbu
  if (Math.abs(num) < 1 && Math.abs(num) > 0) return d3.format(".2f")(num); 
  if (Math.abs(num) < 1000) return d3.format(".0f")(num); // atau .precision(0) atau d3.format("d")
  return d3.format("~s")(num);
};

// Fungsi untuk membungkus teks pada sumbu D3 (jika label terlalu panjang)
export function wrapText(
  textSelection: d3.Selection<SVGTextElement, unknown, SVGGElement, unknown>,
  width: number
): void {
  textSelection.each(function () {
    const text = d3.select(this);
    // Hapus tspan sebelumnya jika ada (penting untuk update)
    text.selectAll("tspan").remove();

    const words = text.text().split(/\s+/).reverse();
    let word;
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const x = text.attr("x") || "0"; // Dapatkan x dari atribut text
    const y = text.attr("y") || "0"; // Dapatkan y dari atribut text
    const dyOriginal = parseFloat(text.attr("dy") || "0"); // dy asli dari text

    let tspan = text.text(null) // Kosongkan teks asli elemen <text>
                    .append("tspan")
                    .attr("x", x) // Set x untuk tspan pertama
                    .attr("y", y)  // Set y untuk tspan pertama
                    .attr("dy", dyOriginal + "em"); // dy awal

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node()!.getComputedTextLength() > width && line.length > 1) { // Cek juga line.length > 1
        line.pop(); // Hapus kata terakhir yang membuat terlalu panjang
        tspan.text(line.join(" ")); // Set tspan dengan baris sebelum kata itu
        line = [word]; // Kata itu jadi awal baris baru
        tspan = text.append("tspan") // Buat tspan baru untuk baris berikutnya
                    .attr("x", x)    // Set x untuk tspan baru
                    .attr("y", y)     // Set y untuk tspan baru
                    .attr("dy", (++lineNumber * lineHeight) + dyOriginal + "em") // dy relatif terhadap lineNumber
                    .text(word);
      }
    }
  });
}