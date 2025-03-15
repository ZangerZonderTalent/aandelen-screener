import yfinance as yf
import numpy as np
import pandas as pd
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Laad environment variabelen
load_dotenv()

app = FastAPI()

# CORS-instellingen (voor je React-frontend)
# In productie zul je dit willen beperken tot je frontend domain
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Voeg meer tickers toe voor een uitgebreidere screener
default_tickers = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "META", "NVDA", "NFLX", "PYPL", "ADBE", 
                  "INTC", "CSCO", "CMCSA", "PEP", "AVGO", "TXN", "QCOM", "COST", "TMUS", "CHTR"]

# Gebruik environment variabele voor tickers als die beschikbaar is
tickers_env = os.getenv("TICKERS")
demo_tickers = tickers_env.split(",") if tickers_env else default_tickers

def calculate_ratr_indicator(
    df,
    length=14,
    smoothing="RMA"
):
    """
    Berekent de ATR-ratio in % (gebaseerd op 14-daagse ATR).
    Dit was je eerdere code voor de RATR. We laten 'max_ratr' erop filteren in /screener.
    """
    df['prevClose'] = df['Close'].shift(1)

    def true_range(row):
        range1 = row['High'] - row['Low']
        range2 = abs(row['High'] - row['prevClose'])
        range3 = abs(row['Low'] - row['prevClose'])
        return max(range1, range2, range3)

    df['TR'] = df.apply(true_range, axis=1)

    if smoothing == "SMA":
        df['smoothed_atr'] = df['TR'].rolling(window=length).mean()
    elif smoothing == "EMA":
        df['smoothed_atr'] = df['TR'].ewm(span=length, adjust=False).mean()
    elif smoothing == "WMA":
        weights = np.arange(1, length + 1)
        def wma(series):
            return (series * weights).sum() / weights.sum()
        df['smoothed_atr'] = df['TR'].rolling(window=length).apply(wma, raw=True)
    else:
        # RMA / Wilder's
        rma_values = []
        prev = None
        for tr_val in df['TR']:
            if pd.isna(tr_val):
                rma_values.append(np.nan)
                continue
            if prev is None:
                prev = tr_val
            else:
                prev = (prev * (length - 1) + tr_val) / length
            rma_values.append(prev)
        df['smoothed_atr'] = rma_values

    df['atr_ratio'] = (df['smoothed_atr'] / df['Close']) * 100

    df.drop(columns=['prevClose','TR','smoothed_atr'], inplace=True, errors='ignore')
    return df

def calculate_200_sma(df):
    """
    Maakt een kolom 'sma_200' en vergelijkt die met 'Close'.
    We gebruiken een rolling(200).mean().
    Let op: 1 jaar data = ~252 trading days, dus we hebben genoeg om een 200SMA te calculeren.
    """
    df['sma_200'] = df['Close'].rolling(window=200).mean()
    return df

def check_sma_periods(df, trend="long", mode="two_halves",
                     sma_pct_first=80.0, sma_pct_second=100.0,
                     sma_pct_entire=100.0):
    """
    Berekent voor 'Close' vs 'sma_200' of de koers erboven (long) of eronder (short) is.
    Splits in 2 helften of check het hele jaar.

    - trend="long" => we willen Close >= sma_200
    - trend="short" => we willen Close <= sma_200
    - mode="two_halves" => kijk naar eerste helft & tweede helft van de dataset
    - mode="entire_year" => kijk naar de hele dataset
    - sma_pct_first => percentage voor eerste helft
    - sma_pct_second => percentage voor tweede helft
    - sma_pct_entire => percentage voor hele dataset
    """
    # Kolom 'above_sma' is True/False afhankelijk van trend
    if trend == "long":
        df['above_sma'] = df['Close'] >= df['sma_200']
    else:  # short
        df['above_sma'] = df['Close'] <= df['sma_200']

    # Converteer naar 1/0
    df['above_sma_int'] = df['above_sma'].astype(int)

    total_rows = len(df)
    if total_rows < 200:
        # We hebben misschien te weinig data om 200SMA te berekenen
        return False  # skip dit aandeel

    if mode == "two_halves":
        # Deel de dataset in 2 helften
        half = total_rows // 2
        df_first = df.iloc[:half]
        df_second = df.iloc[half:]
        # Percentage in elke helft
        if len(df_first) == 0 or len(df_second) == 0:
            return False

        pct_first = 100 * df_first['above_sma_int'].mean()
        pct_second = 100 * df_second['above_sma_int'].mean()

        # Check of ze voldoen aan de gevraagde percentages
        if pct_first >= sma_pct_first and pct_second >= sma_pct_second:
            return True
        else:
            return False

    elif mode == "entire_year":
        # Check 1 periode: het hele jaar
        pct_all = 100 * df['above_sma_int'].mean()
        return pct_all >= sma_pct_entire

    else:
        # Als je mode niet "two_halves" of "entire_year" is, doen we geen SMA-check
        return True  # geen filter

@app.get("/")
def read_root():
    """
    Root endpoint voor health checks
    """
    return {"status": "online", "message": "Aandelen Screener API is actief"}

@app.get("/screener")
def screen_stocks(
    volume: int = 500000,
    max_ratr: float = 999.0,
    trend: str = "long",             # "long" of "short"
    mode: str = "two_halves",        # "two_halves" of "entire_year"
    sma_pct_first: float = 80.0,     # bv. 80% in eerste helft
    sma_pct_second: float = 100.0,   # bv. 100% in tweede helft
    sma_pct_entire: float = 100.0    # bv. 100% voor heel jaar
):
    """
    Endpoint met meerdere filters:
    1) volume (gemiddelde) >= 'volume'
    2) atr_ratio <= 'max_ratr'
    3) 200-SMA check:
       - trend="long" => prijs >= 200SMA
       - trend="short" => prijs <= 200SMA
       - mode="two_halves" => split in 2 helften, check sma_pct_first & sma_pct_second
       - mode="entire_year" => check sma_pct_entire over de hele dataset
    """

    results = []

    for ticker in demo_tickers:
        try:
            # Haal 1 jaar data op, daily
            data = yf.download(ticker, period="1y", interval="1d")

            # MultiIndex flatten
            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.droplevel(1)

            # Als 'Close' mist maar 'Adj Close' is er, rename
            if 'Close' not in data.columns and 'Adj Close' in data.columns:
                data['Close'] = data['Adj Close']
                data.drop(columns='Adj Close', inplace=True)

            # Beperk tot kolommen die we nodig hebben
            needed_cols = ['Open','High','Low','Close','Volume']
            existing_cols = [col for col in needed_cols if col in data.columns]
            data = data[existing_cols]

            if data.empty or 'Close' not in data.columns:
                continue

            # Bereken RATR
            calculate_ratr_indicator(data, length=14, smoothing="RMA")

            # Volume-check
            avg_vol = data['Volume'].mean(skipna=True)
            if pd.isna(avg_vol) or avg_vol < volume:
                continue

            # RATR-check
            last_bar = data.iloc[-1]
            atr_ratio = last_bar.get('atr_ratio', 99999.0)
            if atr_ratio > max_ratr:
                continue

            # Bereken 200-SMA
            calculate_200_sma(data)

            # Controleer of data voldoet aan 200SMA-filter
            if not check_sma_periods(
                data,
                trend=trend,
                mode=mode,
                sma_pct_first=sma_pct_first,
                sma_pct_second=sma_pct_second,
                sma_pct_entire=sma_pct_entire
            ):
                continue

            # Alles ok, voeg toe
            results.append({
                "symbol": ticker,
                "avg_1yr_volume": int(avg_vol),
                "atr_ratio": float(atr_ratio),
                "last_price": float(last_bar['Close']),
            })
        except Exception as e:
            # Log de error maar laat de screener doorgaan
            print(f"Error bij verwerken van {ticker}: {str(e)}")
            continue

    return {"results": results}

# Voor lokale ontwikkeling
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
