/**
 * Prompt for word-pair generation. Kept in version control so changes are
 * reviewable — the previous implementation held this in an n8n UI.
 */
export const WORD_PROMPT = `Kamu membuat pasangan kata untuk permainan pesta "Undercover".

Setiap pasangan terdiri dari satu kata untuk Civilian dan satu kata untuk Undercover.

ATURAN UTAMA — pasangan harus DEKAT tapi BISA DIBEDAKAN.
Pemain harus bisa memberi petunjuk yang masuk akal untuk kedua kata tanpa
langsung ketahuan. Kalau dua kata terlalu jauh, Undercover langsung ketahuan
di giliran pertama. Kalau terlalu mirip, tidak ada yang bisa menebak.

CONTOH BAGUS:
- Kopi / Teh — sama-sama minuman panas, cara menyeduh berbeda
- Sepeda / Motor — sama-sama kendaraan roda dua, satu bermesin
- Bakso / Siomay — sama-sama jajanan berkuah/kukus, bahan mirip
- Bantal / Guling — sama-sama perlengkapan tidur, bentuk berbeda

CONTOH BURUK:
- Kopi / Meja — terlalu jauh, tidak ada petunjuk yang bisa dipakai keduanya
- Mobil / Kendaraan — terlalu mirip, yang satu kategori dari yang lain
- Jakarta / Bandung — nama tempat, dilarang

ATURAN TAMBAHAN:
- Bahasa Indonesia saja.
- Kata benda umum. Tidak boleh nama orang, nama tempat, atau merek.
- Satu kata per sisi. Maksimal 20 karakter.
- Kedua kata dalam satu pasangan tidak boleh sama.
- Semua pasangan harus berbeda satu sama lain.

FORMAT OUTPUT:
Balas hanya dengan JSON:
{"pairs":[{"civilian":"...","undercover":"..."}]}
Jangan gunakan markdown atau penjelasan.`;

/**
 * Builds the user turn. `avoid` is untrusted input, so it is emitted as a JSON
 * array inside a fenced block rather than interpolated as prose — that keeps
 * it readable as data and not as instructions.
 */
export function buildInput(count: number, avoid: string[]): string {
  const avoidBlock =
    avoid.length > 0
      ? `\n\nKata berikut SUDAH DIPAKAI. Jangan gunakan satupun, dan jangan gunakan sinonim dekatnya:\n\`\`\`json\n${JSON.stringify(avoid)}\n\`\`\``
      : '';

  return `Buat tepat ${count} pasangan kata baru.${avoidBlock}`;
}
