const API_BASE_URL = 'http://localhost:5000/api';

let allStudents = [];
let currentStudent = null;
let csvFile = null;
let chartInstances = {
    gradeDistChart: null,
    gradeChart: null,
    passFailChart: null,
    ageGroupChart: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('🚀 Initializing application...');
    
    await checkServerConnection();
    
    const visited = localStorage.getItem('visited');
    if (!visited) {
        showWelcomeModal();
        localStorage.setItem('visited', 'true');
    } else {
        document.getElementById('welcomeModal').style.display = 'none';
    }
    
    setupEventListeners();
    
    await refreshData();
}

async function checkServerConnection() {
    const banner = document.getElementById('connectionBanner');
    const status = document.getElementById('connectionStatus');
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            status.textContent = '✅ Connected to server';
            banner.className = 'connection-banner success';
            setTimeout(() => {
                banner.style.display = 'none';
            }, 3000);
            return true;
        } else {
            throw new Error('Server responded with error');
        }
    } catch (error) {
        console.error('Server connection error:', error);
        status.textContent = '❌ Cannot connect to server. Please start the backend server.';
        banner.className = 'connection-banner error';
        showToast('Cannot connect to server. Make sure the Python backend is running on port 5000.', 'error');
        return false;
    }
}

function closeConnectionBanner() {
    const banner = document.getElementById('connectionBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

function setupEventListeners() {
    const addForm = document.getElementById('addStudentForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddStudent);
    }
    
    const updateForm = document.getElementById('updateStudentForm');
    if (updateForm) {
        updateForm.addEventListener('submit', handleUpdateStudent);
    }
    
    const studentIdInput = document.getElementById('studentId');
    if (studentIdInput) {
        studentIdInput.addEventListener('input', debounce(checkIdAvailability, 500));
    }
    
    const studentMarks = document.getElementById('studentMarks');
    if (studentMarks) {
        studentMarks.addEventListener('input', (e) => updateMarksDisplay(e.target.value));
    }
    
    const csvFileInput = document.getElementById('csvFileInput');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleFileSelect);
    }
    
    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', handleDragOver);
        uploadZone.addEventListener('dragleave', handleDragLeave);
        uploadZone.addEventListener('drop', handleDrop);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 500));
    }
    
    const updateSelectStudent = document.getElementById('updateSelectStudent');
    if (updateSelectStudent) {
        updateSelectStudent.addEventListener('change', loadStudentForUpdate);
    }
    
    const deleteSelectStudent = document.getElementById('deleteSelectStudent');
    if (deleteSelectStudent) {
        deleteSelectStudent.addEventListener('change', loadStudentForDelete);
    }
    
    setupNavigationListeners();
    setupActionButtonListeners();
}

function setupNavigationListeners() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            if (page) {
                showPage(page);
            }
        });
    });
}

function setupActionButtonListeners() {
    document.addEventListener('click', function(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.getAttribute('data-action');
        
        const actionMap = {
            'export-csv': exportCSV,
            'refresh-data': refreshData,
            'choose-file': () => document.getElementById('csvFileInput').click(),
            'clear-file': clearFile,
            'upload-csv': uploadCSV,
            'download-template': downloadTemplate,
            'load-students': loadStudents,
            'search-students': handleSearch,
            'cancel-update': cancelUpdate,
            'confirm-delete': confirmDelete,
            'cancel-delete': cancelDelete,
            'load-analytics': loadAnalytics,
            'print-result': printResult,
            'close-print-modal': closePrintModal
        };
        
        if (actionMap[action]) {
            actionMap[action]();
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.add('show');
        spinner.setAttribute('aria-hidden', 'false');
    }
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.remove('show');
        spinner.setAttribute('aria-hidden', 'true');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const icon = icons[type] || icons.info;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icon;
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    
    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

function closeWelcome() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    showLoading();
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ errors: ['Server error'] }));
            throw new Error(errorData.errors ? errorData.errors.join(', ') : 'Request failed');
        }
        
        const result = await response.json();
        hideLoading();
        
        return result;
    } catch (error) {
        hideLoading();
        console.error('API Request Error:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showToast('Cannot connect to server. Please ensure the backend is running.', 'error');
        } else {
            showToast(error.message, 'error');
        }
        
        throw error;
    }
}

async function loadStudents() {
    try {
        const result = await apiRequest('/students');
        allStudents = result.students || [];
        updateSidebarStats();
        return allStudents;
    } catch (error) {
        console.error('Error loading students:', error);
        allStudents = [];
        return [];
    }
}

async function refreshData() {
    console.log('🔄 Refreshing data...');
    await loadStudents();
    updateSidebarStats();
    updateCurrentPage();
    showToast('Data refreshed successfully', 'success');
}

function updateSidebarStats() {
    const totalEl = document.getElementById('sidebarTotal');
    const avgEl = document.getElementById('sidebarAvg');
    
    if (totalEl) {
        totalEl.textContent = allStudents.length;
    }
    
    if (avgEl) {
        if (allStudents.length > 0) {
            const avg = allStudents.reduce((sum, s) => sum + s.marks, 0) / allStudents.length;
            avgEl.textContent = avg.toFixed(1) + '%';
        } else {
            avgEl.textContent = '0%';
        }
    }
}

function updateCurrentPage() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    
    const pageId = activePage.id;
    
    const pageUpdaters = {
        'homePage': updateDashboard,
        'viewPage': displayAllStudents,
        'updatePage': populateUpdateSelect,
        'deletePage': populateDeleteSelect,
        'analyticsPage': loadAnalytics
    };
    
    if (pageUpdaters[pageId]) {
        pageUpdaters[pageId]();
    }
}

function showPage(pageName) {
    console.log(`📄 Navigating to: ${pageName}`);
    
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.querySelector(`[data-page="${pageName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    updateCurrentPage();
}

async function updateDashboard() {
    if (allStudents.length === 0) {
        resetDashboard();
        return;
    }
    
    try {
        const response = await apiRequest('/analytics');
        const analytics = response.analytics;
        
        updateDashboardMetrics(analytics);
        updateQuickStats(analytics);
        updateGradeDistChart(analytics.grade_distribution);
        updateRecentPerformance();
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

function resetDashboard() {
    const elements = {
        'totalStudents': '0',
        'totalChange': '+0 enrolled',
        'avgScore': '0%',
        'avgChange': '0% vs benchmark',
        'topScore': '0%',
        'topName': '-',
        'passRate': '0%',
        'passCount': '0/0 passing'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
    
    const quickStats = document.getElementById('quickStats');
    if (quickStats) {
        quickStats.innerHTML = '<p style="text-align:center;color:#6b7280;">No data available</p>';
    }
    
    const recentPerf = document.getElementById('recentPerformance');
    if (recentPerf) {
        recentPerf.innerHTML = '<p style="text-align:center;color:#6b7280;">No students to display</p>';
    }
}

function updateDashboardMetrics(analytics) {
    const metrics = {
        'totalStudents': analytics.total_students,
        'totalChange': `+${analytics.total_students} enrolled`,
        'avgScore': analytics.average_marks + '%',
        'passRate': analytics.pass_percentage + '%',
        'passCount': `${analytics.pass_count}/${analytics.total_students} passing`
    };
    
    Object.entries(metrics).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
    
    const avgChangeEl = document.getElementById('avgChange');
    if (avgChangeEl) {
        const benchmark = 75;
        const diff = (analytics.average_marks - benchmark).toFixed(1);
        avgChangeEl.textContent = `${diff}% vs benchmark`;
    }
    
    if (analytics.top_performer) {
        const topScoreEl = document.getElementById('topScore');
        const topNameEl = document.getElementById('topName');
        
        if (topScoreEl) {
            topScoreEl.textContent = analytics.top_performer.marks + '%';
        }
        if (topNameEl) {
            topNameEl.textContent = sanitizeHTML(analytics.top_performer.name.substring(0, 15));
        }
    }
}

function updateQuickStats(analytics) {
    const container = document.getElementById('quickStats');
    if (!container) return;
    
    const stats = [
        { label: 'Total Students', value: analytics.total_students, icon: '👥' },
        { label: 'Average Marks', value: analytics.average_marks + '%', icon: '📊' },
        { label: 'Pass Rate', value: analytics.pass_percentage + '%', icon: '✅' },
        { label: 'Highest Marks', value: analytics.highest_marks, icon: '🏆' },
        { label: 'Lowest Marks', value: analytics.lowest_marks, icon: '📉' },
        { label: 'Below Average', value: analytics.below_average_count, icon: '⚠️' }
    ];
    
    const fragment = document.createDocumentFragment();
    stats.forEach(stat => {
        const div = document.createElement('div');
        div.className = 'stat-row';
        
        const label = document.createElement('span');
        label.textContent = `${stat.icon} ${stat.label}`;
        
        const value = document.createElement('strong');
        value.textContent = stat.value;
        
        div.appendChild(label);
        div.appendChild(value);
        fragment.appendChild(div);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function destroyChart(chartName) {
    if (chartInstances[chartName]) {
        chartInstances[chartName].destroy();
        chartInstances[chartName] = null;
    }
}

function updateGradeDistChart(distribution) {
    const ctx = document.getElementById('gradeDistChart');
    if (!ctx) return;
    
    destroyChart('gradeDistChart');
    
    chartInstances.gradeDistChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(distribution),
            datasets: [{
                data: Object.values(distribution),
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444',
                    '#6b7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateRecentPerformance() {
    const container = document.getElementById('recentPerformance');
    if (!container) return;
    
    if (allStudents.length === 0) {
        container.innerHTML = '<p class="text-center" style="color:#6b7280;">No students to display</p>';
        return;
    }
    
    const topStudents = [...allStudents]
        .sort((a, b) => b.marks - a.marks)
        .slice(0, 5);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'stats-list';
    
    topStudents.forEach((student, index) => {
        const div = document.createElement('div');
        div.className = 'stat-row';
        
        const label = document.createElement('span');
        label.textContent = `${index + 1}. ${sanitizeHTML(student.name)} (${student.grade})`;
        
        const marks = document.createElement('strong');
        marks.style.color = getMarksColor(student.marks);
        marks.textContent = `${student.marks}%`;
        
        div.appendChild(label);
        div.appendChild(marks);
        wrapper.appendChild(div);
    });
    
    container.innerHTML = '';
    container.appendChild(wrapper);
}

function getMarksColor(marks) {
    if (marks >= 90) return '#10b981';
    if (marks >= 80) return '#3b82f6';
    if (marks >= 70) return '#f59e0b';
    if (marks >= 40) return '#f97316';
    return '#ef4444';
}

function updateMarksDisplay(value) {
    const display = document.getElementById('marksDisplay');
    if (display) {
        display.textContent = value;
    }
}

async function checkIdAvailability() {
    const idInput = document.getElementById('studentId');
    const resultDiv = document.getElementById('idCheckResult');
    
    if (!idInput || !idInput.value || !resultDiv) return;
    
    try {
        const response = await apiRequest(`/check-id/${idInput.value}`);
        
        if (response.available) {
            resultDiv.textContent = '✅ ID Available';
            resultDiv.className = 'validation-msg available';
        } else {
            resultDiv.textContent = '❌ ID Already Exists';
            resultDiv.className = 'validation-msg unavailable';
        }
    } catch (error) {
        console.error('Error checking ID:', error);
    }
}

async function handleAddStudent(e) {
    e.preventDefault();
    
    const studentData = {
        id: parseInt(document.getElementById('studentId').value),
        name: document.getElementById('studentName').value.trim(),
        age: parseInt(document.getElementById('studentAge').value),
        grade: document.getElementById('studentGrade').value,
        marks: parseInt(document.getElementById('studentMarks').value)
    };
    
    try {
        const result = await apiRequest('/students', 'POST', studentData);
        
        showToast(result.message, 'success');
        
        e.target.reset();
        updateMarksDisplay('50');
        
        const idCheckResult = document.getElementById('idCheckResult');
        if (idCheckResult) {
            idCheckResult.textContent = '';
        }
        
        await refreshData();
        
    } catch (error) {
        console.error('Error adding student:', error);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            processFile(file);
        } else {
            showToast('Please upload a CSV file', 'error');
        }
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    csvFile = file;
    
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (fileName) fileName.textContent = sanitizeHTML(file.name);
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    if (fileInfo) fileInfo.style.display = 'flex';
    if (uploadBtn) uploadBtn.disabled = false;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        previewCSV(content);
    };
    reader.onerror = function() {
        showToast('Error reading file', 'error');
    };
    reader.readAsText(file);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function previewCSV(content) {
    const preview = document.getElementById('csvPreview');
    const previewContent = document.getElementById('csvPreviewContent');
    
    if (!preview || !previewContent) return;
    
    const lines = content.split('\n').slice(0, 6);
    
    const table = document.createElement('table');
    table.className = 'modern-table';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = lines[0].split(',');
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.trim();
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    for (let i = 1; i < lines.length && i < 6; i++) {
        if (lines[i].trim()) {
            const row = document.createElement('tr');
            const cols = lines[i].split(',');
            cols.forEach(col => {
                const td = document.createElement('td');
                td.textContent = col.trim();
                row.appendChild(td);
            });
            tbody.appendChild(row);
        }
    }
    
    table.appendChild(tbody);
    
    previewContent.innerHTML = '';
    previewContent.appendChild(table);
    
    if (lines.length > 6) {
        const note = document.createElement('p');
        note.style.cssText = 'text-align:center;margin-top:10px;color:#6b7280;';
        note.textContent = `... and ${lines.length - 6} more rows`;
        previewContent.appendChild(note);
    }
    
    preview.style.display = 'block';
}

function clearFile() {
    csvFile = null;
    
    const csvFileInput = document.getElementById('csvFileInput');
    const fileInfo = document.getElementById('fileInfo');
    const csvPreview = document.getElementById('csvPreview');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (csvFileInput) csvFileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (csvPreview) csvPreview.style.display = 'none';
    if (uploadBtn) uploadBtn.disabled = true;
}

async function uploadCSV() {
    if (!csvFile) {
        showToast('Please select a CSV file first', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const content = e.target.result;
        
        try {
            const result = await apiRequest('/upload-csv', 'POST', {
                csv_content: content
            });
            
            showToast(result.message, 'success');
            
            if (result.warnings && result.warnings.length > 0) {
                console.warn('Import warnings:', result.warnings);
                showToast(`Imported with ${result.warnings.length} warning(s). Check console for details.`, 'warning');
            }
            
            clearFile();
            await refreshData();
            
        } catch (error) {
            console.error('Error uploading CSV:', error);
        }
    };
    
    reader.onerror = function() {
        showToast('Error reading file', 'error');
    };
    
    reader.readAsText(csvFile);
}

async function exportCSV() {
    try {
        const result = await apiRequest('/export-csv');
        
        const blob = new Blob([result.csv_content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('CSV exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting CSV:', error);
    }
}

function downloadTemplate() {
    const template = `id,name,age,grade,marks
101,Ali Ahmed,17,A,92
102,Sana Khan,18,B,76
103,Ahmed Hassan,16,A,95
104,Fatima Ali,17,C,52`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('Template downloaded successfully', 'success');
}

function displayAllStudents() {
    const container = document.getElementById('studentsTableWrapper');
    const countElement = document.getElementById('studentCount');
    
    if (!container) return;
    
    if (countElement) {
        countElement.textContent = `Total: ${allStudents.length} students`;
    }
    
    if (allStudents.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><p>No students found. Add your first student!</p></div>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'modern-table';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['ID', 'Name', 'Age', 'Grade', 'Marks'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    allStudents.forEach(student => {
        const row = document.createElement('tr');
        
        const idCell = document.createElement('td');
        const idStrong = document.createElement('strong');
        idStrong.textContent = student.id;
        idCell.appendChild(idStrong);
        row.appendChild(idCell);
        
        const nameCell = document.createElement('td');
        nameCell.textContent = sanitizeHTML(student.name);
        row.appendChild(nameCell);
        
        const ageCell = document.createElement('td');
        ageCell.textContent = student.age;
        row.appendChild(ageCell);
        
        const gradeCell = document.createElement('td');
        const gradeBadge = document.createElement('span');
        gradeBadge.className = `grade-badge grade-${student.grade}`;
        gradeBadge.textContent = student.grade;
        gradeCell.appendChild(gradeBadge);
        row.appendChild(gradeCell);
        
        const marksCell = document.createElement('td');
        const marksBadge = document.createElement('span');
        marksBadge.className = 'marks-badge';
        marksBadge.style.background = getMarksColor(student.marks);
        marksBadge.textContent = `${student.marks}%`;
        marksCell.appendChild(marksBadge);
        row.appendChild(marksCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
}

async function handleSearch() {
    const queryInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');
    
    if (!queryInput || !resultsContainer) return;
    
    const query = queryInput.value.trim();
    
    if (!query) {
        resultsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">🔍</span><p>Enter a search query to find students</p></div>';
        return;
    }
    
    try {
        const response = await apiRequest('/students/search', 'POST', { query });
        const students = response.students;
        
        displaySearchResults(students, query);
        
    } catch (error) {
        console.error('Error searching:', error);
    }
}

function displaySearchResults(students, query) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;
    
    if (students.length === 0) {
        resultsContainer.innerHTML = `<div class="empty-state"><span class="empty-icon">😞</span><p>No students found matching "${sanitizeHTML(query)}"</p></div>`;
        return;
    }
    
    const wrapper = document.createElement('div');
    
    const header = document.createElement('div');
    header.className = 'table-header';
    const count = document.createElement('span');
    count.className = 'table-count';
    count.textContent = `Found: ${students.length} student(s)`;
    header.appendChild(count);
    wrapper.appendChild(header);
    
    const table = document.createElement('table');
    table.className = 'modern-table';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['ID', 'Name', 'Age', 'Grade', 'Marks', 'Actions'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    students.forEach(student => {
        const row = document.createElement('tr');
        
        const idCell = document.createElement('td');
        const idStrong = document.createElement('strong');
        idStrong.textContent = student.id;
        idCell.appendChild(idStrong);
        row.appendChild(idCell);
        
        const nameCell = document.createElement('td');
        nameCell.textContent = sanitizeHTML(student.name);
        row.appendChild(nameCell);
        
        const ageCell = document.createElement('td');
        ageCell.textContent = student.age;
        row.appendChild(ageCell);
        
        const gradeCell = document.createElement('td');
        const gradeBadge = document.createElement('span');
        gradeBadge.className = `grade-badge grade-${student.grade}`;
        gradeBadge.textContent = student.grade;
        gradeCell.appendChild(gradeBadge);
        row.appendChild(gradeCell);
        
        const marksCell = document.createElement('td');
        const marksBadge = document.createElement('span');
        marksBadge.className = 'marks-badge';
        marksBadge.style.background = getMarksColor(student.marks);
        marksBadge.textContent = `${student.marks}%`;
        marksCell.appendChild(marksBadge);
        row.appendChild(marksCell);
        
        const actionsCell = document.createElement('td');
        const printBtn = document.createElement('button');
        printBtn.className = 'btn-icon';
        printBtn.title = 'Print Result';
        printBtn.textContent = '🖨️';
        printBtn.addEventListener('click', () => showPrintPreview(student));
        actionsCell.appendChild(printBtn);
        row.appendChild(actionsCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    wrapper.appendChild(table);
    
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(wrapper);
}

function populateUpdateSelect() {
    const select = document.getElementById('updateSelectStudent');
    if (!select) return;
    
    select.innerHTML = '';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a student --';
    select.appendChild(defaultOption);
    
    allStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `ID ${student.id} - ${sanitizeHTML(student.name)} (${student.grade} - ${student.marks}%)`;
        select.appendChild(option);
    });
}

function loadStudentForUpdate() {
    const select = document.getElementById('updateSelectStudent');
    const container = document.getElementById('updateFormContainer');
    
    if (!select || !container) return;
    
    const studentId = parseInt(select.value);
    
    if (!studentId) {
        container.style.display = 'none';
        return;
    }
    
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    currentStudent = student;
    
    const currentInfo = document.getElementById('currentInfo');
    if (currentInfo) {
        currentInfo.innerHTML = '';
        
        const title = document.createElement('h4');
        title.textContent = '📋 Current Information';
        currentInfo.appendChild(title);
        
        const grid = document.createElement('div');
        grid.className = 'info-grid';
        
        const fields = [
            { label: 'ID', value: student.id },
            { label: 'Name', value: sanitizeHTML(student.name) },
            { label: 'Age', value: student.age },
            { label: 'Grade', value: student.grade },
            { label: 'Marks', value: `${student.marks}%` }
        ];
        
        fields.forEach(field => {
            const item = document.createElement('div');
            item.className = 'info-item';
            
            const label = document.createElement('span');
            label.className = 'info-label';
            label.textContent = field.label;
            
            const value = document.createElement('span');
            value.className = 'info-value';
            value.textContent = field.value;
            
            item.appendChild(label);
            item.appendChild(value);
            grid.appendChild(item);
        });
        
        currentInfo.appendChild(grid);
    }
    
    ['updateId', 'updateName', 'updateAge', 'updateGrade', 'updateMarks'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    container.style.display = 'block';
}

async function handleUpdateStudent(e) {
    e.preventDefault();
    
    if (!currentStudent) {
        showToast('Please select a student first', 'error');
        return;
    }
    
    const updateId = document.getElementById('updateId');
    const updateName = document.getElementById('updateName');
    const updateAge = document.getElementById('updateAge');
    const updateGrade = document.getElementById('updateGrade');
    const updateMarks = document.getElementById('updateMarks');
    
    const newData = {
        id: updateId.value ? parseInt(updateId.value) : currentStudent.id,
        name: updateName.value.trim() || currentStudent.name,
        age: updateAge.value ? parseInt(updateAge.value) : currentStudent.age,
        grade: updateGrade.value || currentStudent.grade,
        marks: updateMarks.value ? parseInt(updateMarks.value) : currentStudent.marks
    };
    
    try {
        const result = await apiRequest(`/students/${currentStudent.id}`, 'PUT', newData);
        
        showToast(result.message, 'success');
        
        const select = document.getElementById('updateSelectStudent');
        const container = document.getElementById('updateFormContainer');
        
        if (select) select.value = '';
        if (container) container.style.display = 'none';
        currentStudent = null;
        
        await refreshData();
        populateUpdateSelect();
        
    } catch (error) {
        console.error('Error updating student:', error);
    }
}

function cancelUpdate() {
    const select = document.getElementById('updateSelectStudent');
    const container = document.getElementById('updateFormContainer');
    
    if (select) select.value = '';
    if (container) container.style.display = 'none';
    currentStudent = null;
}

function populateDeleteSelect() {
    const select = document.getElementById('deleteSelectStudent');
    if (!select) return;
    
    select.innerHTML = '';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a student --';
    select.appendChild(defaultOption);
    
    allStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `ID ${student.id} - ${sanitizeHTML(student.name)} (${student.grade} - ${student.marks}%)`;
        select.appendChild(option);
    });
}

function loadStudentForDelete() {
    const select = document.getElementById('deleteSelectStudent');
    const container = document.getElementById('deleteConfirmContainer');
    
    if (!select || !container) return;
    
    const studentId = parseInt(select.value);
    
    if (!studentId) {
        container.style.display = 'none';
        return;
    }
    
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    currentStudent = student;
    
    const infoCard = document.getElementById('deleteStudentInfo');
    if (infoCard) {
        const grid = document.createElement('div');
        grid.className = 'info-grid';
        
        const fields = [
            { label: 'ID', value: student.id },
            { label: 'Name', value: sanitizeHTML(student.name) },
            { label: 'Age', value: student.age },
            { label: 'Grade', value: student.grade },
            { label: 'Marks', value: `${student.marks}%` }
        ];
        
        fields.forEach(field => {
            const item = document.createElement('div');
            item.className = 'info-item';
            
            const label = document.createElement('span');
            label.className = 'info-label';
            label.textContent = field.label;
            
            const value = document.createElement('span');
            value.className = 'info-value';
            value.textContent = field.value;
            
            item.appendChild(label);
            item.appendChild(value);
            grid.appendChild(item);
        });
        
        infoCard.innerHTML = '';
        infoCard.appendChild(grid);
    }
    
    container.style.display = 'block';
}

async function confirmDelete() {
    if (!currentStudent) {
        showToast('Please select a student first', 'error');
        return;
    }
    
    try {
        const result = await apiRequest(`/students/${currentStudent.id}`, 'DELETE');
        
        showToast(result.message, 'success');
        
        const select = document.getElementById('deleteSelectStudent');
        const container = document.getElementById('deleteConfirmContainer');
        
        if (select) select.value = '';
        if (container) container.style.display = 'none';
        currentStudent = null;
        
        await refreshData();
        populateDeleteSelect();
        
    } catch (error) {
        console.error('Error deleting student:', error);
    }
}

function cancelDelete() {
    const select = document.getElementById('deleteSelectStudent');
    const container = document.getElementById('deleteConfirmContainer');
    
    if (select) select.value = '';
    if (container) container.style.display = 'none';
    currentStudent = null;
}

async function loadAnalytics() {
    if (allStudents.length === 0) {
        clearAnalytics();
        return;
    }
    
    try {
        const response = await apiRequest('/analytics');
        const analytics = response.analytics;
        
        updateAnalyticsKPIs(analytics);
        updatePerformerCards(analytics);
        updateAnalyticsCharts(analytics);
        updateExcellenceList(analytics.excellence_students);
        updateDetailedStats(analytics);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function clearAnalytics() {
    const kpis = {
        'analyticsTotal': '0',
        'analyticsAvg': '0',
        'analyticsPass': '0%',
        'analyticsHigh': '0',
        'topPerformer': '-',
        'topPerformerMarks': '0 marks',
        'belowAvgCount': '0 students'
    };
    
    Object.entries(kpis).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
    
    const excellenceList = document.getElementById('excellenceList');
    if (excellenceList) {
        excellenceList.innerHTML = '<p style="text-align:center;padding:20px;color:#6b7280;">No data available</p>';
    }
}

function updateAnalyticsKPIs(analytics) {
    const kpis = {
        'analyticsTotal': analytics.total_students,
        'analyticsAvg': analytics.average_marks,
        'analyticsPass': analytics.pass_percentage + '%',
        'analyticsHigh': analytics.highest_marks
    };
    
    Object.entries(kpis).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function updatePerformerCards(analytics) {
    if (analytics.top_performer) {
        const topPerformer = document.getElementById('topPerformer');
        const topPerformerMarks = document.getElementById('topPerformerMarks');
        
        if (topPerformer) {
            topPerformer.textContent = sanitizeHTML(analytics.top_performer.name);
        }
        if (topPerformerMarks) {
            topPerformerMarks.textContent = analytics.top_performer.marks + ' marks';
        }
    }
    
    const belowAvgCount = document.getElementById('belowAvgCount');
    if (belowAvgCount) {
        belowAvgCount.textContent = analytics.below_average_count + ' students';
    }
}

function updateAnalyticsCharts(analytics) {
    updateGradeChart(analytics.grade_distribution);
    updatePassFailChart(analytics);
    updateAgeGroupChart(analytics.age_group_performance);
}

function updateGradeChart(distribution) {
    const ctx = document.getElementById('gradeChart');
    if (!ctx) return;
    
    destroyChart('gradeChart');
    
    chartInstances.gradeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(distribution),
            datasets: [{
                label: 'Number of Students',
                data: Object.values(distribution),
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function updatePassFailChart(analytics) {
    const ctx = document.getElementById('passFailChart');
    if (!ctx) return;
    
    destroyChart('passFailChart');
    
    chartInstances.passFailChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Passed', 'Failed'],
            datasets: [{
                data: [analytics.pass_count, analytics.fail_count],
                backgroundColor: ['#10b981', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateAgeGroupChart(ageData) {
    const ctx = document.getElementById('ageGroupChart');
    if (!ctx) return;
    
    destroyChart('ageGroupChart');
    
    const ageLabels = Object.keys(ageData).filter(k => ageData[k] > 0);
    const ageValues = ageLabels.map(k => ageData[k]);
    
    if (ageValues.length === 0) return;
    
    chartInstances.ageGroupChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ageLabels,
            datasets: [{
                label: 'Average Marks',
                data: ageValues,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function updateExcellenceList(excellentStudents) {
    const container = document.getElementById('excellenceList');
    if (!container) return;
    
    if (excellentStudents.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#6b7280;">No students with 90+ marks yet</p>';
        return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'stats-list';
    
    excellentStudents.forEach(student => {
        const div = document.createElement('div');
        div.className = 'stat-row';
        
        const label = document.createElement('span');
        label.textContent = `🌟 ${sanitizeHTML(student.name)}`;
        
        const marks = document.createElement('strong');
        marks.style.color = '#10b981';
        marks.textContent = `${student.marks}%`;
        
        div.appendChild(label);
        div.appendChild(marks);
        wrapper.appendChild(div);
    });
    
    container.innerHTML = '';
    container.appendChild(wrapper);
}

function updateDetailedStats(analytics) {
    const table = document.getElementById('detailedStatsTable');
    if (!table) return;
    
    const stats = [
        ['Total Students', analytics.total_students],
        ['Average Marks', analytics.average_marks + '%'],
        ['Highest Marks', analytics.highest_marks],
        ['Lowest Marks', analytics.lowest_marks],
        ['Pass Count', analytics.pass_count],
        ['Fail Count', analytics.fail_count],
        ['Pass Percentage', analytics.pass_percentage + '%'],
        ['Below Average', analytics.below_average_count],
        ['Excellence (90+)', analytics.excellence_students.length]
    ];
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Metric', 'Value'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    const tbody = document.createElement('tbody');
    stats.forEach(([metric, value]) => {
        const row = document.createElement('tr');
        
        const metricCell = document.createElement('td');
        metricCell.textContent = metric;
        row.appendChild(metricCell);
        
        const valueCell = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = value;
        valueCell.appendChild(strong);
        row.appendChild(valueCell);
        
        tbody.appendChild(row);
    });
    
    table.innerHTML = '';
    table.appendChild(thead);
    table.appendChild(tbody);
}

function showPrintPreview(student) {
    const modal = document.getElementById('printModal');
    const printContent = document.getElementById('printContent');
    
    if (!modal || !printContent) return;
    
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const status = student.marks >= 40 ? 'PASSED' : 'FAILED';
    const statusClass = student.marks >= 40 ? 'status-pass' : 'status-fail';
    const performance = getPerformanceLevel(student.marks);
    const remarks = getRemarks(student.marks);
    
    printContent.innerHTML = `
        <div class="result-card">
            <div class="result-header">
                <div class="school-info">
                    <h1>🎓 SMART STUDENT MANAGEMENT SYSTEM</h1>
                    <p class="school-tagline">Excellence in Education</p>
                    <p class="school-address">Advanced Learning Institute</p>
                </div>
                <div class="result-badge">
                    <div class="badge-title">ACADEMIC RESULT</div>
                    <div class="badge-year">Year 2024</div>
                </div>
            </div>

            <div class="result-divider"></div>

            <div class="student-info-section">
                <h3>📋 Student Information</h3>
                <div class="info-table">
                    <div class="info-row">
                        <span class="info-key">Student ID:</span>
                        <span class="info-val">${student.id}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-key">Student Name:</span>
                        <span class="info-val">${sanitizeHTML(student.name)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-key">Age:</span>
                        <span class="info-val">${student.age} years</span>
                    </div>
                    <div class="info-row">
                        <span class="info-key">Result Date:</span>
                        <span class="info-val">${currentDate}</span>
                    </div>
                </div>
            </div>

            <div class="result-divider"></div>

            <div class="marks-section">
                <h3>📊 Academic Performance</h3>
                <div class="marks-table">
                    <div class="marks-row marks-header">
                        <span>Category</span>
                        <span>Score</span>
                    </div>
                    <div class="marks-row">
                        <span>Total Marks Obtained</span>
                        <span class="marks-value">${student.marks}/100</span>
                    </div>
                    <div class="marks-row">
                        <span>Percentage</span>
                        <span class="marks-value">${student.marks}%</span>
                    </div>
                    <div class="marks-row">
                        <span>Grade Achieved</span>
                        <span class="grade-value grade-${student.grade}">${student.grade}</span>
                    </div>
                    <div class="marks-row">
                        <span>Performance Level</span>
                        <span class="marks-value">${performance}</span>
                    </div>
                </div>
            </div>

            <div class="result-divider"></div>

            <div class="status-section ${statusClass}">
                <div class="status-icon">${student.marks >= 40 ? '✅' : '❌'}</div>
                <div class="status-text">
                    <h2>${status}</h2>
                    <p>${remarks}</p>
                </div>
            </div>

            <div class="result-divider"></div>

            <div class="grading-scale">
                <h4>📋 Grading Scale Reference</h4>
                <div class="scale-grid">
                    <div class="scale-item">
                        <span class="scale-grade">A+</span>
                        <span class="scale-range">90-100</span>
                    </div>
                    <div class="scale-item">
                        <span class="scale-grade">A</span>
                        <span class="scale-range">85-89</span>
                    </div>
                    <div class="scale-item">
                        <span class="scale-grade">B+</span>
                        <span class="scale-range">80-84</span>
                    </div>
                    <div class="scale-item">
                        <span class="scale-grade">B</span>
                        <span class="scale-range">70-79</span>
                    </div>
                    <div class="scale-item">
                        <span class="scale-grade">C+</span>
                        <span class="scale-range">60-69</span>
                    </div>
                    <div class="scale-item">
                        <span class="scale-grade">C</span>
                        <span class="scale-range">50-59</span>
                    </div>
                    <div class="scale-item">
                        <span class="scale-grade">D</span>
                        <span class="scale-range">40-49</span>
                    </div>
                    <div class="scale-item">
                        <span class="scale-grade">F</span>
                        <span class="scale-range">0-39</span>
                    </div>
                </div>
            </div>

            <div class="result-footer">
                <div class="signatures">
                    <div class="signature">
                        <div class="signature-line"></div>
                        <p>Principal's Signature</p>
                    </div>
                    <div class="signature">
                        <div class="signature-line"></div>
                        <p>Class Teacher's Signature</p>
                    </div>
                </div>
                <div class="footer-note">
                    <p>🏫 This is a computer-generated result card</p>
                    <p>📅 Generated on: ${currentDate}</p>
                    <p>Made By Hafiz Mustafa Murtaza</p>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function getPerformanceLevel(marks) {
    if (marks >= 90) return '🌟 Outstanding';
    if (marks >= 80) return '🎯 Excellent';
    if (marks >= 70) return '👍 Very Good';
    if (marks >= 60) return '✔️ Good';
    if (marks >= 50) return '📝 Satisfactory';
    if (marks >= 40) return '⚠️ Pass';
    return '❌ Needs Improvement';
}

function getRemarks(marks) {
    if (marks >= 90) return 'Outstanding performance! Keep up the excellent work.';
    if (marks >= 80) return 'Excellent achievement! Continue the great effort.';
    if (marks >= 70) return 'Very good performance. Keep striving for excellence.';
    if (marks >= 60) return 'Good work. Continue to improve and excel.';
    if (marks >= 50) return 'Satisfactory performance. More effort needed.';
    if (marks >= 40) return 'Passed. Significant improvement required.';
    return 'Failed. Intensive support and remedial work needed.';
}

function printResult() {
    window.print();
}

function closePrintModal() {
    const modal = document.getElementById('printModal');
    if (modal) {
        modal.style.display = 'none';
    }
}