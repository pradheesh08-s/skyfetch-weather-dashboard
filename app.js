function WeatherApp() {
    this.apiKey = '95242427038cef1deae2eb80060d8574';
    this.currentWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
    this.forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';
    this.cityNamePattern = /^[a-zA-Z\s.'-]+$/;
    this.recentSearchesKey = 'skyfetchRecentSearches';
    this.lastSearchedCityKey = 'skyfetchLastSearchedCity';
    this.maxRecentSearches = 6;

    this.weatherForm = document.getElementById('weather-form');
    this.cityInput = document.getElementById('city-input');
    this.weatherDisplay = document.getElementById('weather-display');
    this.statusMessage = document.getElementById('status-message');
    this.searchButton = document.getElementById('search-btn');
    this.recentSearchesContainer = document.getElementById('recent-searches');
    this.clearRecentButton = document.getElementById('clear-recent-btn');

    this.isStorageAvailable = this.checkLocalStorageSupport();
    this.recentSearches = this.getRecentSearches();

    this.bindEvents();
    this.renderRecentSearches();
    this.loadLastSearchedCity();
}

WeatherApp.prototype.bindEvents = function () {
    this.weatherForm.addEventListener('submit', this.handleWeatherSearch.bind(this));
    document.addEventListener('keydown', this.handleRecentSearchShortcut.bind(this));

    if (this.recentSearchesContainer) {
        this.recentSearchesContainer.addEventListener('click', this.handleRecentSearchClick.bind(this));
    }

    if (this.clearRecentButton) {
        this.clearRecentButton.addEventListener('click', this.handleClearRecentSearches.bind(this));
    }
};

WeatherApp.prototype.checkLocalStorageSupport = function () {
    try {
        const testKey = '__skyfetch_test_key__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        return false;
    }
};

WeatherApp.prototype.getRecentSearches = function () {
    if (!this.isStorageAvailable) {
        return [];
    }

    try {
        const savedValue = localStorage.getItem(this.recentSearchesKey);
        if (!savedValue) {
            return [];
        }

        const parsedValue = JSON.parse(savedValue);
        if (!Array.isArray(parsedValue)) {
            return [];
        }

        return parsedValue
            .filter(function (city) {
                return typeof city === 'string';
            })
            .map(function (city) {
                return city.trim();
            })
            .filter(Boolean)
            .slice(0, this.maxRecentSearches);
    } catch (error) {
        return [];
    }
};

WeatherApp.prototype.saveRecentSearches = function () {
    if (!this.isStorageAvailable) {
        return;
    }

    try {
        localStorage.setItem(this.recentSearchesKey, JSON.stringify(this.recentSearches));
    } catch (error) {
        // Ignore storage write issues (e.g., quota exceeded) and keep app usable.
    }
};

WeatherApp.prototype.getLastSearchedCity = function () {
    if (!this.isStorageAvailable) {
        return '';
    }

    try {
        const city = localStorage.getItem(this.lastSearchedCityKey);
        return city ? city.trim() : '';
    } catch (error) {
        return '';
    }
};

WeatherApp.prototype.saveLastSearchedCity = function (city) {
    if (!this.isStorageAvailable) {
        return;
    }

    try {
        localStorage.setItem(this.lastSearchedCityKey, city);
    } catch (error) {
        // Ignore storage write issues (e.g., private mode restrictions).
    }
};

WeatherApp.prototype.loadLastSearchedCity = function () {
    const lastCity = this.getLastSearchedCity();

    if (!lastCity) {
        return;
    }

    this.cityInput.value = lastCity;
    this.searchCity(lastCity, { persistSearch: false });
};

WeatherApp.prototype.addRecentSearch = function (city) {
    const normalizedCity = city.trim();

    if (!normalizedCity) {
        return;
    }

    const uniqueCities = this.recentSearches.filter(function (savedCity) {
        return savedCity.toLowerCase() !== normalizedCity.toLowerCase();
    });

    uniqueCities.unshift(normalizedCity);
    this.recentSearches = uniqueCities.slice(0, this.maxRecentSearches);

    this.saveRecentSearches();
    this.renderRecentSearches();
};

WeatherApp.prototype.clearRecentSearches = function () {
    this.recentSearches = [];
    this.saveRecentSearches();
    this.renderRecentSearches();
};

WeatherApp.prototype.renderRecentSearches = function () {
    if (!this.recentSearchesContainer) {
        return;
    }

    if (this.clearRecentButton) {
        this.clearRecentButton.disabled = this.recentSearches.length === 0;
    }

    this.recentSearchesContainer.innerHTML = '';

    if (!this.recentSearches.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'recent-searches-empty';
        emptyMessage.textContent = 'No recent searches yet.';
        this.recentSearchesContainer.appendChild(emptyMessage);
        return;
    }

    const fragment = document.createDocumentFragment();

    this.recentSearches.forEach(function (city) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'recent-search-btn';
        button.dataset.city = city;
        button.textContent = city;
        fragment.appendChild(button);
    });

    this.recentSearchesContainer.appendChild(fragment);
};

WeatherApp.prototype.handleRecentSearchClick = function (event) {
    const selectedButton = event.target.closest('.recent-search-btn');

    if (!selectedButton) {
        return;
    }

    const city = selectedButton.dataset.city || '';
    this.cityInput.value = city;
    this.searchCity(city);
};

WeatherApp.prototype.handleClearRecentSearches = function () {
    this.clearRecentSearches();
    this.setStatus('Recent searches cleared.', 'status-success');
};

WeatherApp.prototype.handleRecentSearchShortcut = function (event) {
    if (!(event.ctrlKey && event.altKey) || event.metaKey || event.shiftKey) {
        return;
    }

    if (this.searchButton.disabled || event.repeat) {
        return;
    }

    const shortcutIndex = Number(event.key) - 1;

    if (Number.isNaN(shortcutIndex) || shortcutIndex < 0 || shortcutIndex >= this.recentSearches.length) {
        return;
    }

    event.preventDefault();

    const city = this.recentSearches[shortcutIndex];
    this.cityInput.value = city;
    this.searchCity(city);
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

WeatherApp.prototype.searchCity = async function (city, options) {
    const settings = options || {};
    const persistSearch = settings.persistSearch !== false;
    const normalizedCity = city.trim();

    const validationError = this.validateCity(normalizedCity);

    if (validationError) {
        this.renderError(validationError);
        this.cityInput.focus();
        return;
    }

    try {
        this.setLoadingState(true);
        const [currentData, forecastData] = await this.fetchWeatherAndForecast(normalizedCity);
        this.setStatus(`Showing current weather and forecast for ${currentData.name}.`, 'status-success');
        this.renderWeather(currentData, forecastData);

        if (persistSearch) {
            this.saveLastSearchedCity(currentData.name);
            this.addRecentSearch(currentData.name);
        }
    } catch (error) {
        this.renderError(error.message);
    } finally {
        this.setLoadingState(false);
    }
};

WeatherApp.prototype.handleWeatherSearch = function (event) {
    event.preventDefault();

    const city = this.cityInput.value.trim();
    this.searchCity(city);
};

new WeatherApp();