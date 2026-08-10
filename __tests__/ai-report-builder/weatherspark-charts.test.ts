import {
  orderCharts,
  selectChartsForEmbed,
  type WeatherSparkChartImage,
} from '@/lib/ai-report-builder/weatherspark-charts';

function chart(
  key: WeatherSparkChartImage['key'],
  title: string
): WeatherSparkChartImage {
  return {
    key,
    title,
    buffer: Buffer.from(`png-${key}`),
    ext: 'png',
    width: 1000,
    height: 500,
  };
}

describe('weatherspark-charts selection', () => {
  it('orders charts in completed-study sequence', () => {
    const ordered = orderCharts([
      chart('tourism', 'Tourism'),
      chart('snowfall', 'Snow'),
      chart('temperature', 'Temp'),
      chart('precip', 'Precip'),
    ]);
    expect(ordered.map((c) => c.key)).toEqual([
      'temperature',
      'precip',
      'snowfall',
      'tourism',
    ]);
  });

  it('prefers temperature + tourism when limiting embeds', () => {
    const picked = selectChartsForEmbed(
      [
        chart('snowfall', 'Snow'),
        chart('precip', 'Precip'),
        chart('tourism', 'Tourism'),
        chart('temperature', 'Temp'),
      ],
      2
    );
    expect(picked.map((c) => c.key)).toEqual(['temperature', 'tourism']);
  });

  it('returns all charts when under max', () => {
    const charts = [
      chart('temperature', 'Temp'),
      chart('precip', 'Precip'),
      chart('snowfall', 'Snow'),
      chart('tourism', 'Tourism'),
    ];
    expect(selectChartsForEmbed(charts, 4).map((c) => c.key)).toEqual([
      'temperature',
      'precip',
      'snowfall',
      'tourism',
    ]);
  });
});
