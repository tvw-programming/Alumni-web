# GenericChart

`GenericChart` is a library-agnostic, typed chart shell. It owns reusable UI concerns—loading,
error, empty state, legend visibility, accessibility labels—and delegates rendering to an adapter.
The bundled `HighchartsAdapter` translates the stable application model to Highcharts.

```tsx
<GenericChart
  title="Monthly revenue"
  series={revenueSeries}
  xAxis={{ categories: months }}
  yAxis={{ title: 'USD (k)' }}
  multiColor
  interactive
  onPointClick={handlePointClick}
  legend={{ visible: true, toggleable: true }}
  exportOptions={{ enabled: true, formats: ['png', 'csv'] }}
/>
```

Parent components own data fetching, selected-point state, drill-down navigation, popups, and other
application flow. A future chart library can be introduced by passing an `adapter` implementing
`GenericChartAdapterProps`, without changing callers or domain data.

Color precedence is point color, series color, then the internal theme-aware palette. With
`multiColor={false}`, unspecified series share the theme primary color. Comparison transformations
and Highcharts option construction are memoized because they are the expensive adapter work; simple
wrapper values and event handlers are intentionally not blanket-memoized.
