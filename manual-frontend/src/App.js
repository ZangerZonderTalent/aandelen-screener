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
  
  // Nieuwe filters
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(999999);
  
  // State voor sortering en paginering
  const [sortField, setSortField] = useState('symbol');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // State voor resultaten en loading status
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
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
      
      // Filter op prijs
      const filtered = response.data.results.filter(stock => 
        stock.last_price >= minPrice && stock.last_price <= maxPrice
      );
      setFilteredStocks(filtered);
      
      if (response.data.errors) {
        console.warn("API Waarschuwingen:", response.data.errors);
      }
    } catch (error) {
      console.error("Fout bij het ophalen van data:", error);
      setError("Er is een fout opgetreden bij het ophalen van de data. Probeer het later opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  // Sorteerfunctie
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sorteer resultaten
  useEffect(() => {
    const sorted = [...filteredStocks].sort((a, b) => {
      let comparison = 0;
      
      switch(sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'volume':
          comparison = a.avg_1yr_volume - b.avg_1yr_volume;
          break;
        case 'atr':
          comparison = a.atr_ratio - b.atr_ratio;
          break;
        case 'price':
          comparison = a.last_price - b.last_price;
          break;
        case 'date':
          comparison = new Date(a.last_update) - new Date(b.last_update);
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredStocks(sorted);
  }, [sortField, sortDirection]);

  // Paginering
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStocks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);

  // API-verbinding controleren
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: 'red', fontSize: '36px', backgroundColor: 'yellow', padding: '20px' }}>
          NIEUWE VERSIE - AANDELEN SCREENER
        </h1>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
        <div style={{ flex: '1', minWidth: '300px', padding: '20px', backgroundColor: 'lightblue', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '15px', borderBottom: '2px solid blue' }}>Basisfilters</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Min. Gem. Volume: </label>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Max. ATR-ratio (%): </label>
            <input
              type="number"
              value={maxRatr}
              onChange={(e) => setMaxRatr(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div style={{ flex: '1', minWidth: '300px', padding: '20px', backgroundColor: 'lightgreen', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '15px', borderBottom: '2px solid green' }}>SMA Filters</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Trend: </label>
            <select 
              value={trend} 
              onChange={(e) => setTrend(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="long">Long (prijs boven SMA)</option>
              <option value="short">Short (prijs onder SMA)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button 
          onClick={fetchStocks} 
          style={{ 
            backgroundColor: '#3498db', 
            color: 'white', 
            border: 'none', 
            padding: '12px 24px', 
            borderRadius: '4px', 
            cursor: 'pointer', 
            fontSize: '16px' 
          }}
          disabled={loading}
        >
          {loading ? "Bezig met zoeken..." : "ZOEKEN"}
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '15px', borderRadius: '4px', margin: '20px 0', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'auto' }}>
        {filteredStocks.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: '#f8f9fa', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: 'bold' }}>
                  Symbol
                </th>
                <th style={{ backgroundColor: '#f8f9fa', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: 'bold' }}>
                  Gem. Volume
                </th>
                <th style={{ backgroundColor: '#f8f9fa', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: 'bold' }}>
                  ATR Ratio
                </th>
                <th style={{ backgroundColor: '#f8f9fa', padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: 'bold' }}>
                  Laatste Prijs
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((stock) => (
                <tr key={stock.symbol}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>{stock.symbol}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>{stock.avg_1yr_volume.toLocaleString()}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>{stock.atr_ratio.toFixed(2)}%</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>${stock.last_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            {error ? null : "Geen resultaten gevonden. Pas je filters aan en probeer opnieuw."}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
