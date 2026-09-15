// Public provider widgets only: no private quote API or redistributed feed.
export const benchmarks = {
  sp: {name:'S&P 500', etf:'AMEX:SPY', ticker:'SPY', daily:'FRED:SP500', indexLink:'SP-SPX'},
  dow: {name:'Dow Jones Industrial Average', etf:'AMEX:DIA', ticker:'DIA', daily:'FRED:DJIA', indexLink:'DJ-DJI'},
  nasdaq: {name:'Nasdaq Composite', etf:'NASDAQ:ONEQ', ticker:'ONEQ', daily:'FRED:NDQCOM', indexLink:'NASDAQ-IXIC'}
};

export function marketView(key, mode, theme = 'light') {
  const b = benchmarks[key];
  if (!b || !['intraday','daily'].includes(mode)) throw new Error('Unknown market view');
  const intraday = mode === 'intraday';
  const symbol = intraday ? b.etf : b.daily;
  return {
    title: intraday ? `${b.ticker} · ${b.name} tracking ETF` : `${b.name} · daily index levels`,
    description: intraday
      ? `${b.ticker} tracks the ${b.name}. The chart shows ETF share prices in USD, not index points. Free provider data is delayed; check its timestamp and delay indicator. A 1-minute chart interval is not a promise of a 1-minute data delay.`
      : `Exact ${b.name} index levels via FRED. Daily closing observations, not intraday quotes; publication may lag by a trading day or more.`,
    source: `https://www.tradingview.com/symbols/${symbol.replace(':','-')}/`,
    indexSource: `https://www.tradingview.com/symbols/${b.indexLink}/`,
    widget: intraday ? 'embed-widget-advanced-chart' : 'embed-widget-symbol-overview',
    config: intraday ? {
      symbol, interval:'1', range:'1D', timezone:'America/New_York', theme, style:'3', locale:'en',
      allow_symbol_change:false, hide_side_toolbar:true, hide_top_toolbar:false, hide_legend:false,
      hide_volume:true, calendar:false, details:false, hotlist:false, save_image:false,
      withdateranges:true, autosize:true, width:'100%', height:'100%', support_host:'https://www.tradingview.com'
    } : {
      symbols:[[symbol + (intraday ? '|1' : '|1D')]], chartOnly:false, width:'100%', height:'100%', locale:'en', colorTheme:theme,
      autosize:true, showVolume:false, showMA:false, hideDateRanges:false, hideMarketStatus:false,
      hideSymbolLogo:false, scalePosition:'right', scaleMode:'Normal', noTimeScale:false,
      valuesTracking:'1', changeMode:'price-and-percent', chartType:'area', lineWidth:2, lineType:0,
      dateRanges:intraday ? ['1d|1','5d|5','1m|30','3m|60','12m|1D'] : ['1m|1D','3m|1D','12m|1D','60m|1W','all|1M']
    }
  };
}
