function WeatherApp() {
    this.apiKey = '95242427038cef1deae2eb80060d8574';
    this.currentWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
    this.forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';
    this.cityNamePattern = /^[a-zA-Z\s.'-]+$/;

    this.weatherForm = document.getElementById('weather-form');
    this.cityInput = document.getElementById('city-input');
    this.weatherDisplay = document.getElementById('weather-display');
    this.statusMessage = document.getElementById('status-message');
    this.searchButton = document.getElementById('search-btn');

    this.bindEvents();
}

WeatherApp.prototype.bindEvents = function () {
    this.weatherForm.addEventListener('submit', this.handleWeatherSearch.bind(this));
};

WeatherApp.prototype.setStatus = function (message, type) {
    const statusType = type || '';
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${statusType}`.trim();
};

WeatherApp.prototype.setLoadingState = function (isLoading) {
    this.searchButton.disabled = isLoading;

    if (isLoading) {
        this.setStatus('Loading weather data...', 'status-loading');
        this.weatherDisplay.innerHTML = '<p class="loading">Fetching current weather and forecast...</p>';
        return;
    }

    if (this.statusMessage.classList.contains('status-loading')) {
        this.setStatus('');
    }
};

WeatherApp.prototype.validateCity = function (city) {
    if (!city) {
        return 'Please enter a city name before searching.';
    }

    if (!this.cityNamePattern.test(city)) {
        return 'Use letters, spaces, apostrophes, periods, or hyphens in city names.';
    }

    return null;
};

WeatherApp.prototype.buildUrl = function (baseUrl, city) {
    return `${baseUrl}?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=metric`;
};

WeatherApp.prototype.fetchJson = async function (url) {
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('City not found. Check the spelling and try again.');
        }

        throw new Error('Unable to load weather data right now. Please try again in a moment.');
    }

    return response.json();
};

WeatherApp.prototype.fetchWeatherAndForecast = function (city) {
    const currentUrl = this.buildUrl(this.currentWeatherUrl, city);
    const forecastUrl = this.buildUrl(this.forecastUrl, city);

    return Promise.all([
        this.fetchJson(currentUrl),
        this.fetchJson(forecastUrl)
    ]);
};

WeatherApp.prototype.getDayLabel = function (timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, { weekday: 'short' });
};

WeatherApp.prototype.selectFiveDayForecast = function (forecastData) {
    const dailyMap = {};

    forecastData.list.forEach(function (entry) {
        const dateKey = entry.dt_txt.split(' ')[0];
        const hour = new Date(entry.dt * 1000).getHours();

        if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = entry;
            return;
        }

        const currentHour = new Date(dailyMap[dateKey].dt * 1000).getHours();
        if (Math.abs(12 - hour) < Math.abs(12 - currentHour)) {
            dailyMap[dateKey] = entry;
        }
    });

    return Object.keys(dailyMap)
        .sort()
        .slice(0, 5)
        .map(function (key) {
            return dailyMap[key];
        });
};

WeatherApp.prototype.renderForecastCards = function (forecastList) {
    const app = this;

    return forecastList.map(function (entry) {
        const temperature = Math.round(entry.main.temp);
        const description = entry.weather[0].description;
        const icon = entry.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        const dayLabel = app.getDayLabel(entry.dt);

        return `
            <article class="forecast-card">
                <p class="forecast-day">${dayLabel}</p>
                <img src="${iconUrl}" alt="${description}" class="forecast-icon">
                <p class="forecast-temp">${temperature}°C</p>
                <p class="forecast-description">${description}</p>
            </article>
        `;
    }).join('');
};

WeatherApp.prototype.renderWeather = function (currentData, forecastData) {
    const cityName = currentData.name;
    const temperature = Math.round(currentData.main.temp);
    const description = currentData.weather[0].description;
    const icon = currentData.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    const fiveDayForecast = this.selectFiveDayForecast(forecastData);

    this.weatherDisplay.innerHTML = `
        <section class="current-weather weather-info">
            <h2 class="city-name">${cityName}</h2>
            <img src="${iconUrl}" alt="${description}" class="weather-icon">
            <div class="temperature">${temperature}°C</div>
            <p class="description">${description}</p>
        </section>
        <section class="forecast-section weather-info">
            <h3 class="forecast-title">5-Day Forecast</h3>
            <div class="forecast-grid">
                ${this.renderForecastCards(fiveDayForecast)}
            </div>
        </section>
    `;
};

WeatherApp.prototype.renderError = function (message) {
    this.setStatus(message, 'status-error');
    this.weatherDisplay.innerHTML = '<p class="loading">Try searching for another city.</p>';
};

WeatherApp.prototype.handleWeatherSearch = async function (event) {
    event.preventDefault();

    const city = this.cityInput.value.trim();
    const validationError = this.validateCity(city);

    if (validationError) {
        this.renderError(validationError);
        this.cityInput.focus();
        return;
    }

    try {
        this.setLoadingState(true);
        const [currentData, forecastData] = await this.fetchWeatherAndForecast(city);
        this.setStatus(`Showing current weather and forecast for ${currentData.name}.`, 'status-success');
        this.renderWeather(currentData, forecastData);
    } catch (error) {
        this.renderError(error.message);
    } finally {
        this.setLoadingState(false);
    }
};

new WeatherApp();