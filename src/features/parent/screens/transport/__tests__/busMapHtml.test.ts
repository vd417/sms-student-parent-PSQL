import { liveMapSrcDoc } from '../busMapHtml';

describe('liveMapSrcDoc', () => {
  it('builds a real slippy map with the live bus and assigned stop', () => {
    const html = liveMapSrcDoc({
      lat: 28.6,
      lng: 77.3,
      busNo: '12',
      studentStop: { id: 's', name: 'Gate 2', lat: 28.61, lng: 77.31, yours: true },
      stops: [{ id: 'a', name: 'School', lat: 28.62, lng: 77.32 }],
      myLat: 28.59,
      myLng: 77.29,
    });
    expect(html).toContain('tile.openstreetmap.org');
    expect(html).toContain('28.6');
    expect(html).toContain('Gate 2');
    expect(html).toContain('Bus #');
    expect(html).toContain('28.59');
    expect(html).toContain('You');
  });
});
