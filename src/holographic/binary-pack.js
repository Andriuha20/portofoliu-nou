// Lossless byte-plane XOR predictor. No vertex or normal quantization.
export function filterBytes(array) {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
  const stride = array.BYTES_PER_ELEMENT, count = array.length
  const out = new Uint8Array(bytes.length)
  for (let b = 0; b < stride; b++) {
    let previous = 0
    for (let i = 0; i < count; i++) {
      const value = bytes[i * stride + b]
      out[b * count + i] = value ^ previous
      previous = value
    }
  }
  return out
}

export function restoreBytes(bytes, stride) {
  const count = bytes.length / stride, out = new Uint8Array(bytes.length)
  for (let b = 0; b < stride; b++) {
    let previous = 0
    for (let i = 0; i < count; i++) {
      previous ^= bytes[b * count + i]
      out[i * stride + b] = previous
    }
  }
  return out
}

export function predictImage(data, row, step) {
  const out = new Uint16Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const x = i % row, left = x >= step ? data[i - step] : 0
    const up = i >= row ? data[i - row] : 0
    const diagonal = x >= step && i >= row ? data[i - row - step] : 0
    out[i] = data[i] - left - up + diagonal
  }
  return out
}

export function restoreImage(data, row, step) {
  for (let i = 0; i < data.length; i++) {
    const x = i % row, left = x >= step ? data[i - step] : 0
    const up = i >= row ? data[i - row] : 0
    const diagonal = x >= step && i >= row ? data[i - row - step] : 0
    data[i] = data[i] + left + up - diagonal
  }
  return data
}

export function encodePack(records) {
  const blocks = records.map(record => filterBytes(record.predict
    ? predictImage(record.array, record.predict.row, record.predict.step) : record.array))
  const metadata = records.map(({ name, array, predict }) => ({ name, type: array.constructor.name, bytes: array.byteLength, stride: array.BYTES_PER_ELEMENT, predict }))
  const header = new TextEncoder().encode(JSON.stringify(metadata))
  const out = new Uint8Array(4 + header.length + blocks.reduce((n, b) => n + b.length, 0))
  new DataView(out.buffer).setUint32(0, header.length, true)
  out.set(header, 4)
  let offset = 4 + header.length
  for (const block of blocks) { out.set(block, offset); offset += block.length }
  return out
}

export function decodePack(buffer) {
  const bytes = new Uint8Array(buffer), headerLength = new DataView(buffer).getUint32(0, true)
  const records = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + headerLength)))
  const types = { Float32Array, Uint16Array, Uint32Array }
  const result = new Map()
  let offset = 4 + headerLength
  for (const record of records) {
    const Type = types[record.type]
    if (!Type || offset + record.bytes > bytes.length) throw new Error('Invalid bubble data')
    const raw = restoreBytes(bytes.subarray(offset, offset + record.bytes), record.stride)
    const array = new Type(raw.buffer)
    if (record.predict) restoreImage(array, record.predict.row, record.predict.step)
    result.set(record.name, array)
    offset += record.bytes
  }
  return result
}
