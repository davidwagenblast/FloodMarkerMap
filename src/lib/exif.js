export async function readExif(file) {
  try {
    const head = new DataView(await file.slice(0, 256 * 1024).arrayBuffer()); // metadata is near the start
    if (head.getUint16(0) === 0xffd8) return readJpeg(head);
    if (fourcc(head, 4) === 'ftyp') {
      const item = findHeifExif(head);
      if (!item) return {};
      // The EXIF item can sit anywhere in the file, so read it separately
      const v = new DataView(await file.slice(item.offset, item.offset + item.length).arrayBuffer());
      return parseTiff(v, 4 + v.getUint32(0)); // starts with the offset to the TIFF header
    }
  } catch {
  }
  return {};
}

function readJpeg(v) {
  let off = 2;
  while (off + 10 <= v.byteLength) {
    const marker = v.getUint16(off);
    if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10); // APP1 "Exif"
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break; // image data starts
    off += 2 + v.getUint16(off + 2);
  }
  return {};
}

function fourcc(v, off) {
  return String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3));
}

// HEIC files are made of nested boxes: [size][type][contents]. Lists the boxes between start and end.
function boxes(v, start, end) {
  const out = [];
  let off = start;
  while (off + 8 <= end) {
    let size = v.getUint32(off);
    let header = 8;
    if (size === 1) { size = Number(v.getBigUint64(off + 8)); header = 16; } // 64-bit size
    else if (size === 0) size = end - off; // runs to the end
    if (size < header) break;
    out.push({ type: fourcc(v, off + 4), start: off + header, end: Math.min(off + size, end) });
    off += size;
  }
  return out;
}

function findHeifExif(v) {
  const meta = boxes(v, 0, v.byteLength).find((b) => b.type === 'meta');
  if (!meta) return null;
  const children = boxes(v, meta.start + 4, meta.end); // +4: version and flags
  const iinf = children.find((b) => b.type === 'iinf');
  const iloc = children.find((b) => b.type === 'iloc');
  if (!iinf || !iloc) return null;

  let exifId;
  const entries = iinf.start + 4 + (v.getUint8(iinf.start) === 0 ? 2 : 4);
  for (const infe of boxes(v, entries, iinf.end)) {
    const version = v.getUint8(infe.start);
    if (infe.type !== 'infe' || version < 2) continue;
    const idSize = version === 2 ? 2 : 4;
    if (fourcc(v, infe.start + 4 + idSize + 2) === 'Exif') {
      exifId = idSize === 2 ? v.getUint16(infe.start + 4) : v.getUint32(infe.start + 4);
      break;
    }
  }
  if (exifId === undefined) return null;

  let o = iloc.start;
  const version = v.getUint8(o);
  o += 4;
  const read = (bytes) => {
    let n = 0;
    for (let i = 0; i < bytes; i++) n = n * 256 + v.getUint8(o + i);
    o += bytes;
    return n;
  };
  const sizes = read(2);
  const offsetSize = sizes >> 12;
  const lengthSize = (sizes >> 8) & 15;
  const baseSize = (sizes >> 4) & 15;
  const indexSize = version > 0 ? sizes & 15 : 0;
  const idBytes = version < 2 ? 2 : 4;
  for (let i = 0, count = read(idBytes); i < count; i++) {
    const id = read(idBytes);
    const method = version > 0 ? read(2) & 15 : 0;
    read(2); // data reference index
    const base = read(baseSize);
    let first = null;
    for (let e = 0, extents = read(2); e < extents; e++) {
      if (indexSize) read(indexSize);
      const offset = read(offsetSize);
      const length = read(lengthSize);
      if (e === 0) first = { offset: base + offset, length };
    }
    // method 0: stored at a position in the file (the usual case)
    if (id === exifId) return method === 0 && first?.length ? first : null;
  }
  return null;
}

function parseTiff(v, start) {
  const le = v.getUint16(start) === 0x4949; // "II" little-endian, "MM" big-endian
  const u16 = (o) => v.getUint16(start + o, le);
  const u32 = (o) => v.getUint32(start + o, le);
  const entries = (ifd) => {
    const out = {};
    for (let i = 0, n = u16(ifd); i < n; i++) out[u16(ifd + 2 + i * 12)] = ifd + 2 + i * 12;
    return out;
  };
  const ascii = (e) => {
    const count = u32(e + 4);
    const o = count > 4 ? u32(e + 8) : e + 8;
    let s = '';
    for (let i = 0; i < count - 1; i++) s += String.fromCharCode(v.getUint8(start + o + i));
    return s;
  };
  const degrees = (e) => {
    const o = u32(e + 8);
    const [d, m, s] = [0, 1, 2].map((i) => u32(o + i * 8) / u32(o + i * 8 + 4));
    return d + m / 60 + s / 3600;
  };

  const result = {};
  const ifd0 = entries(u32(4));

  if (ifd0[0x8825]) {
    const gps = entries(u32(ifd0[0x8825] + 8));
    if (gps[2] && gps[4]) {
      const lat = degrees(gps[2]) * (gps[1] && ascii(gps[1]) === 'S' ? -1 : 1);
      const lon = degrees(gps[4]) * (gps[3] && ascii(gps[3]) === 'W' ? -1 : 1);
      // Some phones write 0,0 when they had no fix
      if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) Object.assign(result, { lat, lon });
    }
  }

  if (ifd0[0x8769]) {
    const exif = entries(u32(ifd0[0x8769] + 8));
    const stamp = exif[0x9003] || exif[0x9004]; // when taken, else when digitized
    const taken = stamp && ascii(stamp).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}:\d{2}:\d{2})/);
    if (taken) Object.assign(result, { date: `${taken[1]}-${taken[2]}-${taken[3]}`, time: taken[4] });
  }

  return result;
}
