const cryptoList = document.getElementById('cryptoList');
const searchInput = document.getElementById('searchInput');
const globalMarketCap = document.getElementById('globalMarketCap');
const global24hVolume = document.getElementById('global24hVolume');
const btcDominance = document.getElementById('btcDominance');
const tableContainer = document.querySelector('.table-container');

let cryptoData = [];
let filteredData = [];
let previousPrices = new Map();
let globalData = {
    totalMarketCap: 0,
    total24hVolume: 0,
    btcDominance: 0
};
let lastScrollTime = 0;
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 2000; // Update every 2 seconds

// Random number between min and max
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Filter data based on search term
function filterData(searchTerm) {
    if (!searchTerm) {
        filteredData = [...cryptoData];
        return;
    }
    searchTerm = searchTerm.toLowerCase().trim();
    filteredData = cryptoData.filter(coin => 
        coin.name.toLowerCase().includes(searchTerm) || 
        coin.symbol.toLowerCase().includes(searchTerm)
    );
}

// Update data without refreshing the display
function updateDataOnly() {
    if (cryptoData.length === 0) return;

    let totalMarketCap = 0;
    let total24hVolume = 0;

    cryptoData.forEach(coin => {
        const prevPrice = coin.current_price;
        const priceChange = random(-0.02, 0.02);
        
        coin.current_price *= (1 + priceChange);
        coin.price_change_percentage_1h_in_currency += random(-1, 1);
        coin.price_change_percentage_24h += random(-1, 1);
        coin.price_change_percentage_7d_in_currency += random(-1, 1);
        coin.total_volume *= (1 + random(-0.05, 0.05));
        coin.market_cap = coin.current_price * coin.circulating_supply;
        
        if (coin.sparkline_in_7d && coin.sparkline_in_7d.price) {
            coin.sparkline_in_7d.price.shift();
            coin.sparkline_in_7d.price.push(coin.current_price);
        }
        
        previousPrices.set(coin.id, prevPrice);
        totalMarketCap += coin.market_cap;
        total24hVolume += coin.total_volume;
    });
    
    globalData.totalMarketCap = totalMarketCap;
    globalData.total24hVolume = total24hVolume;
    globalData.btcDominance = (cryptoData[0].market_cap / totalMarketCap) * 100;
    
    filterData(searchInput.value);
}

// Check if enough time has passed since last update
function shouldUpdate() {
    const now = Date.now();
    if (now - lastUpdateTime >= UPDATE_INTERVAL) {
        lastUpdateTime = now;
        return true;
    }
    return false;
}

// Check if user is actively scrolling
function isActivelyScrolling() {
    return Date.now() - lastScrollTime < 500;
}

// Simulate real-time price changes
function simulateRealTimeChanges() {
    updateDataOnly();
    
    if (!isActivelyScrolling() && shouldUpdate()) {
        const scrollPosition = tableContainer.scrollTop;
        displayCryptoData(filteredData);
        tableContainer.scrollTop = scrollPosition;
    }
    
    setTimeout(simulateRealTimeChanges, UPDATE_INTERVAL);
}

// Handle scroll events
tableContainer.addEventListener('scroll', () => {
    lastScrollTime = Date.now();
});

// Display crypto data in the table
function displayCryptoData(data) {
    if (isActivelyScrolling()) {
        return;
    }
    
    cryptoList.innerHTML = '';
    
    if (data.length === 0) {
        cryptoList.innerHTML = '<tr><td colspan="13" style="text-align: center;">No cryptocurrencies found matching your search.</td></tr>';
        return;
    }
    
    data.forEach((coin, index) => {
        const row = document.createElement('tr');
        const chartId = `chart-${coin.id}`;
        
        const percentageClass1h = coin.price_change_percentage_1h_in_currency >= 0 ? 'positive' : 'negative';
        const percentageClass24h = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
        const percentageClass7d = coin.price_change_percentage_7d_in_currency >= 0 ? 'positive' : 'negative';
        const athChangeClass = coin.ath_change_percentage >= 0 ? 'positive' : 'negative';
        
        const previousPrice = previousPrices.get(coin.id);
        const priceChanged = previousPrice && previousPrice !== coin.current_price;
        const priceClass = priceChanged ? 'price-flash' : '';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="coin-name">
                <img src="${coin.image}" alt="${coin.name}" class="coin-image">
                ${coin.name} <span style="color: rgba(255,255,255,0.6)">${coin.symbol.toUpperCase()}</span>
            </td>
            <td class="${priceClass}">$${coin.current_price.toFixed(2)}</td>
            <td class="${percentageClass1h}">${formatPercentage(coin.price_change_percentage_1h_in_currency)}</td>
            <td class="${percentageClass24h}">${formatPercentage(coin.price_change_percentage_24h)}</td>
            <td class="${percentageClass7d}">${formatPercentage(coin.price_change_percentage_7d_in_currency)}</td>
            <td>$${formatNumber(coin.market_cap)}</td>
            <td class="${priceChanged ? 'price-flash' : ''}">$${formatNumber(coin.total_volume)}</td>
            <td>${formatNumber(coin.circulating_supply)} ${coin.symbol.toUpperCase()}</td>
            <td>${coin.max_supply ? formatNumber(coin.max_supply) : '∞'}</td>
            <td>$${formatNumber(coin.ath)}</td>
            <td class="${athChangeClass}">${formatPercentage(coin.ath_change_percentage)}</td>
            <td class="chart-cell">
                <canvas id="${chartId}" class="mini-chart"></canvas>
            </td>
        `;
        
        cryptoList.appendChild(row);
        
        if (coin.sparkline_in_7d && coin.sparkline_in_7d.price) {
            createSparkline(chartId, coin.sparkline_in_7d.price);
        }
    });
    
    updateGlobalInfo();
}

// Format number with appropriate suffix (K, M, B, T)
function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
}

// Format percentage
function formatPercentage(percent) {
    if (!percent) return '0.00%';
    return percent.toFixed(2) + '%';
}

// Update global market information
function updateGlobalInfo() {
    globalMarketCap.textContent = `$${formatNumber(globalData.totalMarketCap)}`;
    global24hVolume.textContent = `$${formatNumber(globalData.total24hVolume)}`;
    btcDominance.textContent = `${globalData.btcDominance.toFixed(2)}%`;
}

// Create sparkline chart
function createSparkline(containerId, data) {
    const ctx = document.getElementById(containerId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(data.length).fill(''),
            datasets: [{
                data: data,
                borderColor: data[0] <= data[data.length - 1] ? '#10b981' : '#ef4444',
                borderWidth: 2,
                fill: true,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return null;
                    
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    if (data[0] <= data[data.length - 1]) {
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                    } else {
                        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
                        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
                    }
                    return gradient;
                },
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            }
        }
    });
}

// Search functionality with debounce
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        filterData(e.target.value);
        displayCryptoData(filteredData);
    }, 300);
});

// Fetch crypto data from CoinGecko API
async function fetchCryptoData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=1h,24h,7d');
        const data = await response.json();
        cryptoData = data;
        filteredData = [...data];
        displayCryptoData(filteredData);
        
        if (!window.simulationStarted) {
            window.simulationStarted = true;
            simulateRealTimeChanges();
        }
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        cryptoList.innerHTML = '<tr><td colspan="13" style="text-align: center;">Error loading data. Please try again later.</td></tr>';
    }
}

// Initial data fetch
fetchCryptoData();

// Fetch new base data every 60 seconds
setInterval(fetchCryptoData, 60000);
