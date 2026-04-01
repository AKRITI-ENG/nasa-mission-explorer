const NASA_API_URL = 'https://api.nasa.gov/planetary/apod';

const elements = {
    form: document.getElementById('search-form'),
    dateInput: document.getElementById('date-input'),
    loading: document.getElementById('loading-state'),
    error: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    card: document.getElementById('apod-card'),
    image: document.getElementById('apod-image'),
    video: document.getElementById('apod-video'),
    title: document.getElementById('apod-title'),
    date: document.getElementById('apod-date'),
    copyright: document.getElementById('apod-copyright'),
    description: document.getElementById('apod-description')
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    const finalDate = new Date(date.getTime() + offset);
    
    return finalDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
    });
};

const initDatePicker = () => {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    
    elements.dateInput.max = formattedToday;
    elements.dateInput.value = formattedToday;
};

const updateUIState = (state, errorMsg = '') => {
    elements.loading.classList.add('hidden');
    elements.error.classList.add('hidden');
    elements.card.classList.add('hidden');

    if (state === 'loading') {
        elements.loading.classList.remove('hidden');
    } else if (state === 'error') {
        elements.error.classList.remove('hidden');
        elements.errorMessage.textContent = errorMsg;
    } else if (state === 'success') {
        elements.card.classList.remove('hidden');
    }
};

const renderApodData = (data) => {
    elements.title.textContent = data.title;
    elements.date.textContent = `📅 ${formatDate(data.date)}`;
    elements.description.textContent = data.explanation;

    if (data.copyright) {
        elements.copyright.textContent = `© ${data.copyright.trim().replace(/\n/g, '')}`;
        elements.copyright.classList.remove('hidden');
    } else {
        elements.copyright.classList.add('hidden');
    }

    elements.image.classList.add('hidden');
    elements.video.classList.add('hidden');

    if (data.media_type === 'video') {
        elements.video.src = data.url;
        elements.video.classList.remove('hidden');
        updateUIState('success');
    } else {
        updateUIState('success');
        elements.image.classList.add('hidden');
        
        elements.image.onload = () => {
            elements.image.classList.remove('hidden');
        };
        
        elements.image.onerror = () => {
            console.error("Failed to load the NASA image.");
        };

        elements.image.src = data.url;
        elements.image.alt = data.title;
    }
};

const fetchApod = async (date = '') => {
    updateUIState('loading');

    try {
        const queryDate = date || elements.dateInput.value;
        const cacheKey = `nasa_${queryDate}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            renderApodData(JSON.parse(cached));
            return;
        }

        const dateQuery = date ? `&date=${date}` : '';
        const response = await fetch(`${NASA_API_URL}?api_key=${API_KEY}${dateQuery}`);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error("Demo API rate limit exceeded. Please add your own NASA API key to config.js!");
            }
            throw new Error(data.msg || 'Something went wrong fetching from NASA.');
        }

        localStorage.setItem(cacheKey, JSON.stringify(data));
        renderApodData(data);
    } catch (err) {
        console.error("NASA Fetch Error:", err);
        updateUIState('error', err.message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();
    fetchApod();
});

elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    
    const selectedDate = elements.dateInput.value;
    if (selectedDate) {
        fetchApod(selectedDate);
    }
});
