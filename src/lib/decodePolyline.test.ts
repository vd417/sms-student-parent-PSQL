import { decodePolyline } from './decodePolyline'

describe('decodePolyline', () => {
  it('decodes a known Google encoded polyline fixture', () => {
    const result = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
    expect(result).toHaveLength(3)
    expect(result[0].latitude).toBeCloseTo(38.5, 4)
    expect(result[0].longitude).toBeCloseTo(-120.2, 4)
  })

  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([])
  })
})
