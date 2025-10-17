#!/usr/bin/env python3
"""yfinance를 이용해 주요 지수/자산 시세를 출력하는 도구."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Iterable, Mapping, Tuple

import pandas as pd
import yfinance as yf


@dataclass
class Quote:
    id: str
    label: str
    price: float | None
    change_percent: float | None


def fetch_quotes(tickers: Mapping[str, Tuple[str, str]]) -> Iterable[Quote]:
    symbols = list(tickers.keys())
    data = yf.download(symbols, period="2d", progress=False, group_by="ticker", auto_adjust=False)

    for symbol, (quote_id, label) in tickers.items():
        price = None
        change_percent = None

        try:
            if isinstance(data.columns, pd.MultiIndex) and data.columns.names[0] == "Ticker":
                series = data[(symbol, "Close")]
            elif isinstance(data.columns, pd.MultiIndex):
                series = data["Close"][symbol]
            else:
                series = data["Close"]
            series = series.dropna()
            if not series.empty:
                price = float(series.iloc[-1])
                if len(series) > 1:
                    prev = float(series.iloc[-2])
                    if prev not in (0, float("inf")):
                        change_percent = ((price - prev) / prev) * 100
        except KeyError:
            pass

        yield Quote(id=quote_id, label=label, price=price, change_percent=change_percent)


def main() -> None:
    tickers = {
        "^IXIC": ("nasdaq", "나스닥 지수"),
        "^GSPC": ("sp500", "S&P 500"),
        "^DJI": ("dji", "다우존스"),
        "^N225": ("nikkei", "니케이 225"),
        "NQ=F": ("nasdaq_futures", "나스닥 선물"),
        "^VIX": ("vix", "VIX"),
        "BTC-USD": ("btc", "비트코인 (BTC)"),
        "ETH-USD": ("eth", "이더리움 (ETH)"),
    }

    quotes = [
        {
            "id": quote.id,
            "label": quote.label,
            "price": quote.price,
            "changePercent": quote.change_percent,
        }
        for quote in fetch_quotes(tickers)
    ]

    print(json.dumps(quotes, ensure_ascii=False))


if __name__ == "__main__":
    main()
