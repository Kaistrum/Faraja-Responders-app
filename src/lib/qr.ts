/**
 * Minimal QR encoder — byte mode, error-correction level L, versions 1–13
 * (up to 425 data bytes), fixed mask pattern 0. No dependencies.
 *
 * Implements the pieces of ISO/IEC 18004 needed to encode a URL: byte-mode
 * segment, Reed–Solomon ECC over GF(256), block interleaving, function
 * patterns, format/version info, zigzag placement. Mask 0 is always applied
 * (any declared mask is valid for decoders; the penalty-scored mask choice
 * only optimizes scan robustness).
 */

// ─── GF(256) arithmetic (poly 0x11D) ─────────────────────────────────────────

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP[i] = x;
		LOG[x] = i;
		x <<= 1;
		if (x & 0x100) x ^= 0x11d;
	}
	for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

function gfMul(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	return EXP[LOG[a] + LOG[b]];
}

function rsGenerator(degree: number): Uint8Array {
	let poly = new Uint8Array([1]);
	for (let i = 0; i < degree; i++) {
		const next = new Uint8Array(poly.length + 1);
		for (let j = 0; j < poly.length; j++) {
			next[j] ^= gfMul(poly[j], EXP[i]);
			next[j + 1] ^= poly[j];
		}
		poly = next;
	}
	return poly.reverse(); // highest-degree first
}

function rsEncode(data: Uint8Array, eccLen: number): Uint8Array {
	const gen = rsGenerator(eccLen);
	const res = new Uint8Array(data.length + eccLen);
	res.set(data);
	for (let i = 0; i < data.length; i++) {
		const factor = res[i];
		if (factor === 0) continue;
		for (let j = 1; j < gen.length; j++) {
			res[i + j] ^= gfMul(gen[j], factor);
		}
	}
	return res.slice(data.length);
}

// ─── Version tables (EC level L only) ────────────────────────────────────────

// [version, eccPerBlock, blocks: [count, dataCodewords][]]
const VERSIONS: [number, number, [number, number][]][] = [
	[1, 7, [[1, 19]]],
	[2, 10, [[1, 34]]],
	[3, 15, [[1, 55]]],
	[4, 20, [[1, 80]]],
	[5, 26, [[1, 108]]],
	[6, 18, [[2, 68]]],
	[7, 20, [[2, 78]]],
	[8, 24, [[2, 97]]],
	[9, 30, [[2, 116]]],
	[10, 18, [[2, 68], [2, 69]]],
	[11, 20, [[4, 81]]],
	[12, 24, [[2, 92], [2, 93]]],
	[13, 26, [[4, 107]]]
];

const ALIGNMENT: Record<number, number[]> = {
	1: [],
	2: [6, 18],
	3: [6, 22],
	4: [6, 26],
	5: [6, 30],
	6: [6, 34],
	7: [6, 22, 38],
	8: [6, 24, 42],
	9: [6, 26, 46],
	10: [6, 28, 50],
	11: [6, 30, 54],
	12: [6, 32, 58],
	13: [6, 34, 62]
};

function dataCapacityBytes(version: number): number {
	const [, , blocks] = VERSIONS[version - 1];
	const totalData = blocks.reduce((sum, [count, size]) => sum + count * size, 0);
	const headerBits = 4 + (version <= 9 ? 8 : 16);
	return Math.floor((totalData * 8 - headerBits) / 8);
}

// ─── Bit buffer ──────────────────────────────────────────────────────────────

class BitBuffer {
	bits: number[] = [];
	push(value: number, length: number) {
		for (let i = length - 1; i >= 0; i--) this.bits.push((value >> i) & 1);
	}
	toBytes(totalBytes: number): Uint8Array {
		// terminator (up to 4 zero bits), pad to byte boundary
		const capacityBits = totalBytes * 8;
		const term = Math.min(4, capacityBits - this.bits.length);
		for (let i = 0; i < term; i++) this.bits.push(0);
		while (this.bits.length % 8 !== 0) this.bits.push(0);

		const bytes: number[] = [];
		for (let i = 0; i < this.bits.length; i += 8) {
			let b = 0;
			for (let j = 0; j < 8; j++) b = (b << 1) | this.bits[i + j];
			bytes.push(b);
		}
		// pad codewords
		const pads = [0xec, 0x11];
		let p = 0;
		while (bytes.length < totalBytes) bytes.push(pads[p++ % 2]);
		return new Uint8Array(bytes);
	}
}

// ─── BCH for format / version info ───────────────────────────────────────────

function bchRemainder(value: number, generator: number, genDegree: number, totalDegree: number): number {
	let rem = value << genDegree;
	for (let i = totalDegree - 1; i >= genDegree; i--) {
		if (rem & (1 << i)) rem ^= generator << (i - genDegree);
	}
	return rem;
}

function formatBits(): number {
	// EC level L = 0b01, mask 0 = 0b000 → 5 data bits 01000
	const data = 0b01000;
	const rem = bchRemainder(data, 0b10100110111, 10, 15);
	return ((data << 10) | rem) ^ 0b101010000010010;
}

function versionBits(version: number): number {
	const rem = bchRemainder(version, 0b1111100100101, 12, 18);
	return (version << 12) | rem;
}

// ─── Matrix construction ─────────────────────────────────────────────────────

export interface QrMatrix {
	size: number;
	// true = dark module
	get(row: number, col: number): boolean;
}

export function encodeQr(text: string): QrMatrix {
	const data = new TextEncoder().encode(text);

	const spec = VERSIONS.find(([v]) => dataCapacityBytes(v) >= data.length);
	if (!spec) throw new Error(`Data too long for QR v13-L (${data.length} bytes, max ${dataCapacityBytes(13)})`);
	const [version, eccPerBlock, blockSpec] = spec;
	const size = 17 + version * 4;

	// ── encode data bits ──
	const totalDataBytes = blockSpec.reduce((s, [c, d]) => s + c * d, 0);
	const buf = new BitBuffer();
	buf.push(0b0100, 4); // byte mode
	buf.push(data.length, version <= 9 ? 8 : 16);
	for (const b of data) buf.push(b, 8);
	const dataBytes = buf.toBytes(totalDataBytes);

	// ── split into blocks, compute ECC, interleave ──
	const dataBlocks: Uint8Array[] = [];
	let offset = 0;
	for (const [count, sizePer] of blockSpec) {
		for (let i = 0; i < count; i++) {
			dataBlocks.push(dataBytes.slice(offset, offset + sizePer));
			offset += sizePer;
		}
	}
	const eccBlocks = dataBlocks.map(b => rsEncode(b, eccPerBlock));

	const interleaved: number[] = [];
	const maxData = Math.max(...dataBlocks.map(b => b.length));
	for (let i = 0; i < maxData; i++) {
		for (const b of dataBlocks) if (i < b.length) interleaved.push(b[i]);
	}
	for (let i = 0; i < eccPerBlock; i++) {
		for (const b of eccBlocks) interleaved.push(b[i]);
	}

	// ── matrix scaffolding ──
	// modules: -1 unset, 0 light, 1 dark; reserved marks function modules
	const modules = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
	const reserved = Array.from({ length: size }, () => new Uint8Array(size));

	function set(r: number, c: number, dark: boolean, reserve = true) {
		modules[r][c] = dark ? 1 : 0;
		if (reserve) reserved[r][c] = 1;
	}

	function placeFinder(top: number, left: number) {
		for (let r = -1; r <= 7; r++) {
			for (let c = -1; c <= 7; c++) {
				const rr = top + r;
				const cc = left + c;
				if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
				const dark =
					r >= 0 && r <= 6 && c >= 0 && c <= 6 &&
					(r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
				set(rr, cc, dark);
			}
		}
	}
	placeFinder(0, 0);
	placeFinder(0, size - 7);
	placeFinder(size - 7, 0);

	// timing patterns
	for (let i = 8; i < size - 8; i++) {
		if (!reserved[6][i]) set(6, i, i % 2 === 0);
		if (!reserved[i][6]) set(i, 6, i % 2 === 0);
	}

	// alignment patterns — placed at every center-pair except the three that
	// coincide with the finder patterns. Legitimate centers may sit on the
	// timing row/col (e.g. (6, 32)); the alignment pattern overwrites timing
	// there, which is per spec.
	const centers = ALIGNMENT[version];
	const isFinderCorner = (r: number, c: number) =>
		(r === 6 && c === 6) ||
		(r === 6 && c === size - 7) ||
		(r === size - 7 && c === 6);
	for (const cr of centers) {
		for (const cc of centers) {
			if (isFinderCorner(cr, cc)) continue;
			for (let r = -2; r <= 2; r++) {
				for (let c = -2; c <= 2; c++) {
					const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
					set(cr + r, cc + c, dark);
				}
			}
		}
	}

	// dark module
	set(size - 8, 8, true);

	// reserve + write format info (mask 0, level L). Bit i is the i-th LSB.
	const fmt = formatBits();
	for (let i = 0; i < 15; i++) {
		const bit = ((fmt >> i) & 1) === 1;
		// Top-left copy: bits 0-7 down col 8, bits 8-14 along row 8.
		if (i < 6) set(i, 8, bit);
		else if (i === 6) set(7, 8, bit);
		else if (i === 7) set(8, 8, bit);
		else if (i < 14) set(8, i - 8, bit); // i=8..13 → cols 0..5
		else set(8, 7, bit); // i=14
		// Second copy: bits 0-7 along row 8 (from right), bits 8-14 up col 8.
		if (i < 8) set(8, size - 1 - i, bit);
		else set(size - 15 + i, 8, bit);
	}

	// version info for v7+
	if (version >= 7) {
		const vb = versionBits(version);
		for (let i = 0; i < 18; i++) {
			const bit = ((vb >> i) & 1) === 1;
			const r = Math.floor(i / 3);
			const c = i % 3;
			set(r, size - 11 + c, bit);
			set(size - 11 + c, r, bit);
		}
	}

	// ── zigzag data placement with mask 0 ──
	const totalBits = interleaved.length * 8;
	let bitIdx = 0;
	let upward = true;
	for (let colPair = size - 1; colPair > 0; colPair -= 2) {
		if (colPair === 6) colPair = 5; // skip timing column
		for (let step = 0; step < size; step++) {
			const r = upward ? size - 1 - step : step;
			for (const c of [colPair, colPair - 1]) {
				if (reserved[r][c]) continue;
				let bit = 0;
				if (bitIdx < totalBits) {
					bit = (interleaved[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
				}
				bitIdx++;
				// mask 0: invert when (r + c) even
				const masked = (r + c) % 2 === 0 ? bit ^ 1 : bit;
				modules[r][c] = masked;
			}
		}
		upward = !upward;
	}

	return {
		size,
		get: (r, c) => modules[r][c] === 1
	};
}

/** Renders a QR matrix onto a canvas with a quiet zone, scaled to canvas size. */
export function drawQrToCanvas(canvas: HTMLCanvasElement, text: string): void {
	const qr = encodeQr(text);
	const quiet = 4;
	const total = qr.size + quiet * 2;
	const scale = Math.max(1, Math.floor(canvas.width / total));
	const pad = Math.floor((canvas.width - qr.size * scale) / 2);

	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#000000";
	for (let r = 0; r < qr.size; r++) {
		for (let c = 0; c < qr.size; c++) {
			if (qr.get(r, c)) {
				ctx.fillRect(pad + c * scale, pad + r * scale, scale, scale);
			}
		}
	}
}
