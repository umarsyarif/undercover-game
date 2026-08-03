/**
 * Prompt for word-pair generation. Kept in version control so changes are
 * reviewable — the previous implementation held this in an n8n UI.
 */

/**
 * Domains the generator rotates through.
 *
 * Live testing showed the model collapsing onto the same handful of pairs
 * across independent calls — Sendok/Garpu, Sapu/Pel and Kemeja/Kaos each came
 * back three times in sixteen requests, all of them kitchen or household. The
 * `avoid` list cannot fix that: a blacklist blocks exact collisions but does
 * not create variety, so excluding Sendok/Garpu merely yields Pisau/Garpu.
 *
 * Reasoning models reject `temperature`, so the usual variance knob is gone.
 * The variance is therefore generated here and named explicitly per request.
 */
export const CATEGORIES = [
  'makanan & jajanan',
  'minuman',
  'buah & sayur',
  'hewan',
  'peralatan dapur',
  'perabot rumah',
  'pakaian & aksesoris',
  'kendaraan & transportasi',
  'olahraga',
  'musik & alat musik',
  'film & budaya pop',
  'teknologi & aplikasi',
  'profesi',
  'alam & cuaca',
  'tempat umum',
  'permainan & mainan',
  'konsep abstrak (perasaan, sifat, keadaan)',
  'bagian tubuh',
  'Indonesia (makanan daerah, budaya, transportasi khas, tempat terkenal)',
] as const;

/**
 * Picks `count` categories at random. Cycles when more pairs are requested
 * than there are categories, so even a maximum-size request gets full spread
 * before anything repeats.
 */
export function pickCategories(count: number): string[] {
  const pool = [...CATEGORIES] as string[];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const picked: string[] = [];
  while (picked.length < count) {
    picked.push(...pool.slice(0, Math.min(count - picked.length, pool.length)));
  }

  return picked.slice(0, count);
}

export const WORD_PROMPT = `Kamu membuat pasangan kata untuk permainan pesta "Undercover".

Setiap pasangan terdiri dari satu kata untuk Civilian dan satu kata untuk Undercover.

ATURAN UTAMA — pasangan harus DEKAT tapi BISA DIBEDAKAN.
Pemain harus bisa memberi petunjuk yang masuk akal untuk kedua kata tanpa
langsung ketahuan. Kalau dua kata terlalu jauh, Undercover langsung ketahuan
di giliran pertama. Kalau terlalu mirip, tidak ada yang bisa menebak.

CONTOH BAGUS (perhatikan variasi kategorinya):
- Kopi / Teh — minuman panas, cara menyeduh berbeda
- Elang / Rajawali — burung pemangsa, ukuran dan habitat berbeda
- Gitar / Ukulele — alat musik petik, jumlah senar berbeda
- Gojek / Grab — aplikasi ojek online, fiturnya mirip
- Iri / Cemburu — sama-sama rasa tidak rela, pemicunya berbeda
- Rendang / Gulai — masakan bersantan, cara memasak berbeda

CONTOH BURUK:
- Kopi / Meja — terlalu jauh, tidak ada petunjuk yang bisa dipakai keduanya
- Mobil / Kendaraan — yang satu kategori dari yang lain
- Ayam / Daging — tumpang tindih, ayam itu daging
- Persija / Persib — cuma dikenal penggemar bola, sebagian pemain tidak bisa ikut

ATURAN:
- Bahasa Indonesia.
- Maksimal 2 kata dan 20 karakter per sisi. "Nasi Goreng" boleh.
- Merek, aplikasi, film, dan tempat BOLEH dipakai, tapi hanya yang hampir
  semua orang di Indonesia kenal. Kalau butuh pengetahuan khusus, jangan.
- Nama orang (artis, atlet, tokoh) TIDAK BOLEH.
- Konsep abstrak justru bagus: perasaan, sifat, atau keadaan yang mirip tapi
  tidak sama membuat petunjuk tetap samar sampai beberapa ronde.
- Kedua kata dalam satu pasangan tidak boleh sama.
- Semua pasangan harus berbeda satu sama lain.
- Jangan memakai pasangan yang sudah dicontohkan di atas.

FORMAT OUTPUT:
Balas hanya dengan JSON:
{"pairs":[{"civilian":"...","undercover":"..."}]}
Jangan gunakan markdown atau penjelasan.`;

/**
 * Builds the user turn.
 *
 * `avoid` is untrusted input, so it is emitted as a JSON array inside a fenced
 * block rather than interpolated as prose — that keeps it readable as data and
 * not as instructions.
 */
export function buildInput(
  count: number,
  avoid: string[],
  categories: string[]
): string {
  const assignments = categories
    .slice(0, count)
    .map((category, i) => `${i + 1}. ${category}`)
    .join('\n');

  const avoidBlock =
    avoid.length > 0
      ? `\n\nKata berikut SUDAH DIPAKAI. Jangan pakai lagi, dan hindari sinonim dekatnya:\n\`\`\`json\n${JSON.stringify(avoid)}\n\`\`\``
      : '';

  return `Buat tepat ${count} pasangan kata baru.

Pakai satu pasangan untuk tiap kategori berikut, sesuai urutan:
${assignments}${avoidBlock}`;
}
