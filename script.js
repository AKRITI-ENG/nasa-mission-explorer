const API_BASE = 'https://api.nasa.gov/planetary/apod';

const searchForm = document.getElementById('search-form');
const dateInput = document.getElementById('date-input');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMsgEl = document.getElementById('error-message');

const apodCard = document.getElementById('apod-card');
const apodImg = document.getElementById('apod-image');
const apodVideo = document.getElementById('apod-video');
const titleEl = document.getElementById('apod-title');
const dateEl = document.getElementById('apod-date');
const copyrightEl = document.getElementById('apod-copyright');
const descEl = document.getElementById('apod-description');

const saveBtn = document.getElementById('fav-btn');
const favGrid = document.getElementById('fav-grid');
const favEmpty = document.getElementById('fav-empty');
const favCountEl = document.getElementById('fav-count');

const searchInput = document.getElementById('fav-search');
const filterSelect = document.getElementById('fav-filter');
const sortSelect = document.getElementById('fav-sort');
const clearAllBtn = document.getElementById('clear-favs-btn');

const themeBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeLabel = document.getElementById('theme-label');

let currentData = null;

function formatDateString(str) {
    let d = new Date(str);
    let offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() + offset).toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
}

function setupDatePicker() {
    let today = new Date().toISOString().split('T')[0];
    dateInput.max = today;
    dateInput.value = today;
}

const setUIState = (status, msg = '') => {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    apodCard.classList.add('hidden');

    if (status === 'loading') {
        loadingState.classList.remove('hidden');
    } else if (status === 'error') {
        errorState.classList.remove('hidden');
        errorMsgEl.textContent = msg;
    } else if (status === 'success') {
        apodCard.classList.remove('hidden');
    }
};

function renderApod(data) {
    titleEl.textContent = data.title;
    dateEl.textContent = `📅 ` + formatDateString(data.date);
    descEl.textContent = data.explanation;

    if (data.copyright) {
        let cleanCopy = data.copyright.trim().replace(/\n/g, '');
        copyrightEl.textContent = `© ` + cleanCopy;
        copyrightEl.classList.remove('hidden');
    } else {
        copyrightEl.classList.add('hidden');
    }

    apodImg.classList.add('hidden');
    apodVideo.classList.add('hidden');

    if (data.media_type === 'video') {
        apodVideo.src = data.url;
        apodVideo.classList.remove('hidden');
        setUIState('success');
    } else {
        setUIState('success');
        apodImg.classList.add('hidden');
        
        apodImg.onload = () => {
            apodImg.classList.remove('hidden');
        };
        apodImg.onerror = () => {
            console.error('image failed to load');
        };
        apodImg.src = data.url;
        apodImg.alt = data.title;
    }

    checkIfSaved();
}

async function getApodData(selectedDate = '') {
    setUIState('loading');

    try {
        let dateToUse = selectedDate;
        if (!dateToUse) {
            dateToUse = dateInput.value;
        }
        
        let cacheKey = "nasa_" + dateToUse;
        let cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
            currentData = JSON.parse(cachedData);
            renderApod(currentData);
            return;
        }

        let queryParam = '';
        if (selectedDate) {
            queryParam = `&date=${selectedDate}`;
        }
        
        const res = await fetch(`${API_BASE}?api_key=${API_KEY}${queryParam}`);
        const resultData = await res.json();

        if (!res.ok) {
            if (res.status === 429) {
                throw new Error('Rate limit hit! You need a real API key.');
            }
            throw new Error(resultData.msg || 'Error fetching data from NASA.');
        }

        localStorage.setItem(cacheKey, JSON.stringify(resultData));
        currentData = resultData;
        
        renderApod(resultData);
    } catch (e) {
        console.error('API Error:', e);
        setUIState('error', e.message);
    }
}

searchForm.addEventListener('submit', function(event) {
    event.preventDefault();
    let val = dateInput.value;
    if (val) {
        getApodData(val);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setupDatePicker();
    getApodData();
    updateFavsUI();
    setupTheme();
});

function setupTheme() {
    let savedTheme = localStorage.getItem('nasa_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    changeThemeIcon(savedTheme);
}

function changeThemeIcon(mode) {
    if (mode === 'dark') {
        themeIcon.textContent = '☀️';
        themeLabel.textContent = 'Light Mode';
    } else {
        themeIcon.textContent = '🌙';
        themeLabel.textContent = 'Dark Mode';
    }
}

themeBtn.addEventListener('click', () => {
    let currentMode = document.documentElement.getAttribute('data-theme');
    let newMode = 'dark';
    if(currentMode === 'dark') {
        newMode = 'light';
    }

    document.documentElement.setAttribute('data-theme', newMode);
    localStorage.setItem('nasa_theme', newMode);
    changeThemeIcon(newMode);
});

function getFavsFromStore() {
    let rawStr = localStorage.getItem('nasa_favs');
    if (!rawStr) return [];
    return JSON.parse(rawStr);
}

function updateFavBtnText() {
    if (!currentData) return;
    let favList = getFavsFromStore();
    
    let found = favList.find(function(item) {
        return item.date === currentData.date;
    });

    if (found) {
        saveBtn.textContent = '♥ Saved';
        saveBtn.classList.add('saved');
    } else {
        saveBtn.textContent = '♡ Save';
        saveBtn.classList.remove('saved');
    }
}

function checkIfSaved() { 
    updateFavBtnText(); 
}

saveBtn.addEventListener('click', () => {
    if (!currentData) return;
    
    let list = getFavsFromStore();
    
    let exists = list.find((item) => item.date === currentData.date);

    if (exists) {
        let filtered = list.filter((item) => item.date !== currentData.date);
        localStorage.setItem('nasa_favs', JSON.stringify(filtered));
    } else {
        list.unshift({
            title: currentData.title,
            date: currentData.date,
            url: currentData.url,
            media_type: currentData.media_type,
        });
        
        localStorage.setItem('nasa_favs', JSON.stringify(list.slice(0, 20)));
    }

    checkIfSaved();
    updateFavsUI();
});

function getFilteredAndSorted() {
    let searchWord = searchInput.value.toLowerCase().trim();
    let typeFilter = filterSelect.value;
    let sortType = sortSelect.value;

    let items = getFavsFromStore();

    if (searchWord !== '') {
        items = items.filter(function(obj) {
            let lowerTitle = obj.title.toLowerCase();
            return lowerTitle.includes(searchWord) || obj.date.includes(searchWord);
        });
    }

    if (typeFilter !== 'all') {
        items = items.filter((obj) => obj.media_type === typeFilter);
    }

    items = items.sort((valA, valB) => {
        if (sortType === 'newest') {
            return new Date(valB.date) - new Date(valA.date);
        }
        if (sortType === 'oldest') {
            return new Date(valA.date) - new Date(valB.date);
        }
        if (sortType === 'az') {
            return valA.title.localeCompare(valB.title);
        }
        if (sortType === 'za') {
            return valB.title.localeCompare(valA.title);
        }
        return 0; 
    });

    return items;
}

function updateFavsUI() {
    let allSaves = getFavsFromStore();
    let displayItems = getFilteredAndSorted();

    let totalCount = allSaves.reduce((acc, curr) => {
        return acc + 1;
    }, 0);
    
    favCountEl.textContent = totalCount + " saved";

    favGrid.innerHTML = '';

    if (displayItems.length === 0) {
        favEmpty.classList.remove('hidden');
        return;
    }
    
    favEmpty.classList.add('hidden');

    displayItems.forEach(function(item) {
        let box = document.createElement('div');
        box.className = 'fav-card';

        let mediaDisplay = '';
        if (item.media_type === 'video') {
            mediaDisplay = `<div class="fav-video-thumb">▶</div>`;
        } else {
            mediaDisplay = `<img src="${item.url}" alt="saved photo" loading="lazy"/>`;
        }

        box.innerHTML = `
            ${mediaDisplay}
            <div class="fav-card-body">
                <div class="fav-card-title">${item.title}</div>
                <div class="fav-card-date">${item.date}</div>
                <button class="fav-card-remove">[ Remove ]</button>
            </div>
        `;

        let delBtn = box.querySelector('.fav-card-remove');
        delBtn.addEventListener('click', function(evt) {
            evt.stopPropagation();
            let newList = getFavsFromStore().filter((i) => i.date !== item.date);
            localStorage.setItem('nasa_favs', JSON.stringify(newList));
            
            updateFavsUI();
            checkIfSaved();
        });

        favGrid.appendChild(box);
    });
}

searchInput.addEventListener('input', updateFavsUI);
filterSelect.addEventListener('change', updateFavsUI);
sortSelect.addEventListener('change', updateFavsUI);

clearAllBtn.addEventListener('click', () => {
    localStorage.setItem('nasa_favs', JSON.stringify([]));
    updateFavsUI();
    checkIfSaved();
});