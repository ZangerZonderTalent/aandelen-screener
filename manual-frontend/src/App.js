import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Gebruik een environment variabele voor de API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function App() {
  // State voor filters
  const [volume, setVolume] = useState(500000);   // min. gem volume
  const [maxRatr, setMaxRatr] = useState(999);    // max. atr ratio
  const [trend, setTrend] = useState("long");     // "long" of "short"
  const [mode, setMode] = useState("two_halves"); // "two_halves" of "entire_year"
  const [smaPctFirst, setSmaPctFirst] = useState(80);  // % eerste helft
  const [smaPctSecond, setSmaPctSecond] = useState(100); // % tweede helft
  const [smaPctEntire, setSmaPctEntire] = useState(100); // % hele jaar
  
  // State voor resultaten en loading status
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Functie om aandelen op te halen
  const fetchStocks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_URL}/screener?volume=${volume}&max_ratr=${maxRatr}&trend=${trend}&mode=${mode}&sma_pct_first=${smaPctFirst}&sma_pct_second=${smaPctSecond}&sma_pct_entire=${smaPctEntire}`;
      const response = await axios.get(url);
      setStocks(response.data.results);
    } catch (error) {
      console.error("Fout bij het ophalen van data:", error);
      setError("Er is een fout opgetreden bij het ophalen van de data. Probeer het later opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  // Controleer API-verbinding bij het laden
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        await axios.get(`${API_URL}/`);
        console.log("API-verbinding succesvol");
      } catch (error) {
        console.error("Kan geen verbinding maken met de API:", error);
        setError("Kan geen verbinding maken met de API. Controleer of de backend draait.");
      }
    };
    
    checkApiConnection();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Mijn Aandelen Screener</h1>
      </header>

      <div className="filter-container">
        <div className="filter-section">
          <h2>Basisfilters</h2>
          
          <div className="filter-row">
            <label>Min. Gem. Volume: </label>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-row">
            <label>Max. ATR-ratio (%): </label>
            <input
              type="number"
              value={maxRatr}
              onChange={(e) => setMaxRatr(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>

        <div className="filter-section">
          <h2>SMA Filters</h2>
          
          <div className="filter-row">
            <label>Trend: </label>
            <select 
              value={trend} 
              onChange={(e) => setTrend(e.target.value)}
              className="filter-select"
            >
              <option value="long">Long (prijs boven SMA)</option>
              <option value="short">Short (prijs onder SMA)</option>
            </select>
          </div>

          <div className="filter-row">
            <label>Mode: </label>
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value)}
              className="filter-select"
            >
              <option value="two_halves">Twee helften</option>
              <option value="entire_year">Heel jaar</option>
            </select>
          </div>

          {mode === "two_halves" ? (
            <>
              <div className="filter-row">
                <label>% Eerste helft: </label>
                <input
                  type="number"
                  value={smaPctFirst}
                  onChange={(e) => setSmaPctFirst(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-row">
                <label>% Tweede helft: </label>
                <input
                  type="number"
                  value={smaPctSecond}
                  onChange={(e) => setSmaPctSecond(e.target.value)}
                  className="filter-input"
                />
              </div>
            </>
          ) : (
            <div className="filter-row">
              <label>% Heel jaar: </label>
              <input
                type="number"
                value={smaPctEntire}
                onChange={(e) => setSmaPctEntire(e.target.value)}
                className="filter-input"
              />
            </div>
          )}
        </div>
      </div>

      <div className="action-container">
        <button 
          onClick={fetchStocks} 
          className="search-button"
          disabled={loading}
        >
          {loading ? "Zoeken..." : "Zoeken"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="results-container">
        {stocks.length > 0 ? (
          <table className="results-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Gem. Volume</th>
                <th>ATR Ratio</th>
                <th>Laatste Prijs</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <tr key={stock.symbol}>
                  <td>{stock.symbol}</td>
                  <td>{stock.avg_1yr_volume.toLocaleString()}</td>
                  <td>{stock.atr_ratio.toFixed(2)}%</td>
                  <td>${stock.last_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !loading && (
          <div className="no-results">
            {error ? null : "Geen resultaten gevonden. Pas je filters aan en probeer opnieuw."}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
