const API_KEY = '95242427038cef1deae2eb80060d8574';
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

const weatherForm = document.getElementById('weather-form');
const cityInput = document.getElementById('city-input');
const weatherDisplay = document.getElementById('weather-display');
const statusMessage = document.getElementById('status-message');
const searchButton = document.getElementById('search-btn');
const CITY_NAME_PATTERN = /^[a-zA-Z\s.'-]+$/;

function setStatus(message, type = '') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`.trim();
}

function setLoadingState(isLoading) {
    searchButton.disabled = isLoading;

    if (isLoading) {
        setStatus('Loading weather data...', 'status-loading');
        weatherDisplay.innerHTML = '<p class="loading">Fetching latest weather...</p>';
        return;
    }

    if (statusMessage.classList.contains('status-loading')) {
        setStatus('');
    }
}

function renderWeather(data) {
    const cityName = data.name;
    const temperature = Math.round(data.main.temp);
    const description = data.weather[0].description;
    const icon = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

    const weatherHTML = `
        <div class="weather-info">
            <h2 class="city-name">${cityName}</h2>
            <img src="${iconUrl}" alt="${description}" class="weather-icon">
            <div class="temperature">${temperature}°C</div>
            <p class="description">${description}</p>
        </div>
    `;

    weatherDisplay.innerHTML = weatherHTML;
}

function renderError(message) {
    setStatus(message, 'status-error');
    weatherDisplay.innerHTML = '<p class="loading">Try searching for another city.</p>';
}

async function fetchWeather(city) {
    const url = `${API_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('City not found. Check the spelling and try again.');
        }

        throw new Error('Unable to load weather data right now. Please try again in a moment.');
    }

    return response.json();
}

async function handleWeatherSearch(event) {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        renderError('Please enter a city name before searching.');
        cityInput.focus();
        return;
    }

    if (!CITY_NAME_PATTERN.test(city)) {
        renderError('Use letters, spaces, apostrophes, periods, or hyphens in city names.');
        cityInput.focus();
        return;
    }

    try {
        setLoadingState(true);
        const weatherData = await fetchWeather(city);
        setStatus(`Showing weather for ${weatherData.name}.`, 'status-success');
        renderWeather(weatherData);
    } catch (error) {
        renderError(error.message);
    } finally {
        setLoadingState(false);
    }
}

weatherForm.addEventListener('submit', handleWeatherSearch);