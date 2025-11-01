const API_BASE_URL = 'http://localhost:5000/api';

let allStudents = [];
let currentStudent = null;
let csvFile = null;

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

function showLoading() {
    document.getElementById('loadingSpinner').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.remove('show');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const icon = icons[type] || icons.info;
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
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
    document.getElementById('welcomeModal').style.display = 'none';
}

function showWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'flex';
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
    document.getElementById('sidebarTotal').textContent = allStudents.length;
    
    if (allStudents.length > 0) {
        const avg = allStudents.reduce((sum, s) => sum + s.marks, 0) / allStudents.length;
        document.getElementById('sidebarAvg').textContent = avg.toFixed(1) + '%';
    } else {
        document.getElementById('sidebarAvg').textContent = '0%';
    }
}

function updateCurrentPage() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    
    const pageId = activePage.id;
    
    switch(pageId) {
        case 'homePage':
            updateDashboard();
            break;
        case 'viewPage':
            displayAllStudents();
            break;
        case 'updatePage':
            populateUpdateSelect();
            break;
        case 'deletePage':
            populateDeleteSelect();
            break;
        case 'analyticsPage':
            loadAnalytics();
            break;
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
        document.getElementById('totalStudents').textContent = '0';
        document.getElementById('totalChange').textContent = '+0 enrolled';
        document.getElementById('avgScore').textContent = '0%';
        document.getElementById('avgChange').textContent = '0% vs benchmark';
        document.getElementById('topScore').textContent = '0%';
        document.getElementById('topName').textContent = '-';
        document.getElementById('passRate').textContent = '0%';
        document.getElementById('passCount').textContent = '0/0 passing';
        
        document.getElementById('quickStats').innerHTML = '<p style="text-align:center;color:#6b7280;">No data available</p>';
        document.getElementById('recentPerformance').innerHTML = '<p style="text-align:center;color:#6b7280;">No students to display</p>';
        return;
    }
    
    try {
        const response = await apiRequest('/analytics');
        const analytics = response.analytics;
        
        document.getElementById('totalStudents').textContent = analytics.total_students;
        document.getElementById('totalChange').textContent = `+${analytics.total_students} enrolled`;
        
        document.getElementById('avgScore').textContent = analytics.average_marks + '%';
        const benchmark = 75;
        const diff = (analytics.average_marks - benchmark).toFixed(1);
        document.getElementById('avgChange').textContent = `${diff}% vs benchmark`;
        
        if (analytics.top_performer) {
            document.getElementById('topScore').textContent = analytics.top_performer.marks + '%';
            document.getElementById('topName').textContent = analytics.top_performer.name.substring(0, 15);
        }
        
        document.getElementById('passRate').textContent = analytics.pass_percentage + '%';
        document.getElementById('passCount').textContent = `${analytics.pass_count}/${analytics.total_students} passing`;
        
        updateQuickStats(analytics);
        
        updateGradeDistChart(analytics.grade_distribution);
        
        updateRecentPerformance();
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

function updateQuickStats(analytics) {
    const container = document.getElementById('quickStats');
    
    const stats = [
        { label: 'Total Students', value: analytics.total_students, icon: '👥' },
        { label: 'Average Marks', value: analytics.average_marks + '%', icon: '📊' },
        { label: 'Pass Rate', value: analytics.pass_percentage + '%', icon: '✅' },
        { label: 'Highest Marks', value: analytics.highest_marks, icon: '🏆' },
        { label: 'Lowest Marks', value: analytics.lowest_marks, icon: '📉' },
        { label: 'Below Average', value: analytics.below_average_count, icon: '⚠️' }
    ];
    
    let html = '';
    stats.forEach(stat => {
        html += `
            <div class="stat-row">
                <span>${stat.icon} ${stat.label}</span>
                <strong>${stat.value}</strong>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateGradeDistChart(distribution) {
    const ctx = document.getElementById('gradeDistChart');
    if (!ctx) return;
    
    if (window.gradeDistChartInstance) {
        window.gradeDistChartInstance.destroy();
    }
    
    window.gradeDistChartInstance = new Chart(ctx, {
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
    
    if (allStudents.length === 0) {
        container.innerHTML = '<p class="text-center" style="color:#6b7280;">No students to display</p>';
        return;
    }
    
    const topStudents = [...allStudents]
        .sort((a, b) => b.marks - a.marks)
        .slice(0, 5);
    
    let html = '<div class="stats-list">';
    topStudents.forEach((student, index) => {
        const marksColor = getMarksColor(student.marks);
        html += `
            <div class="stat-row">
                <span>${index + 1}. ${student.name} (${student.grade})</span>
                <strong style="color: ${marksColor}">${student.marks}%</strong>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function getMarksColor(marks) {
    if (marks >= 90) return '#10b981';
    if (marks >= 80) return '#3b82f6';
    if (marks >= 70) return '#f59e0b';
    if (marks >= 40) return '#f97316';
    return '#ef4444';
}

function updateMarksDisplay(value) {
    document.getElementById('marksDisplay').textContent = value;
}

async function checkIdAvailability() {
    const idInput = document.getElementById('studentId');
    const resultDiv = document.getElementById('idCheckResult');
    
    if (!idInput || !idInput.value) {
        if (resultDiv) {
            resultDiv.textContent = '';
            resultDiv.className = 'validation-msg';
        }
        return;
    }
    
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
        document.getElementById('marksDisplay').textContent = '50';
        document.getElementById('idCheckResult').textContent = '';
        
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
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'flex';
    uploadBtn.disabled = false;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        previewCSV(content);
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
    
    const lines = content.split('\n').slice(0, 6);
    
    let html = '<table class="modern-table"><thead><tr>';
    
    const headers = lines[0].split(',');
    headers.forEach(header => {
        html += `<th>${header.trim()}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    for (let i = 1; i < lines.length && i < 6; i++) {
        if (lines[i].trim()) {
            html += '<tr>';
            const cols = lines[i].split(',');
            cols.forEach(col => {
                html += `<td>${col.trim()}</td>`;
            });
            html += '</tr>';
        }
    }
    
    html += '</tbody></table>';
    
    if (lines.length > 6) {
        html += `<p style="text-align:center;margin-top:10px;color:#6b7280;">... and ${lines.length - 6} more rows</p>`;
    }
    
    previewContent.innerHTML = html;
    preview.style.display = 'block';
}

function clearFile() {
    csvFile = null;
    document.getElementById('csvFileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('csvPreview').style.display = 'none';
    document.getElementById('uploadBtn').disabled = true;
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
    
    countElement.textContent = `Total: ${allStudents.length} students`;
    
    if (allStudents.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">📭</span><p>No students found. Add your first student!</p></div>';
        return;
    }
    
    let html = `
        <table class="modern-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Grade</th>
                    <th>Marks</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    allStudents.forEach(student => {
        const marksColor = getMarksColor(student.marks);
        html += `
            <tr>
                <td><strong>${student.id}</strong></td>
                <td>${student.name}</td>
                <td>${student.age}</td>
                <td><span class="grade-badge grade-${student.grade}">${student.grade}</span></td>
                <td><span class="marks-badge" style="background: ${marksColor}">${student.marks}%</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!query) {
        resultsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">🔍</span><p>Enter a search query to find students</p></div>';
        return;
    }
    
    try {
        const response = await apiRequest('/students/search', 'POST', { query });
        const students = response.students;
        
        if (students.length === 0) {
            resultsContainer.innerHTML = `<div class="empty-state"><span class="empty-icon">😞</span><p>No students found matching "${query}"</p></div>`;
            return;
        }
        
        let html = `
            <div class="table-header">
                <span class="table-count">Found: ${students.length} student(s)</span>
            </div>
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Age</th>
                        <th>Grade</th>
                        <th>Marks</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        students.forEach(student => {
            const marksColor = getMarksColor(student.marks);
            html += `
                <tr>
                    <td><strong>${student.id}</strong></td>
                    <td>${student.name}</td>
                    <td>${student.age}</td>
                    <td><span class="grade-badge grade-${student.grade}">${student.grade}</span></td>
                    <td><span class="marks-badge" style="background: ${marksColor}">${student.marks}%</span></td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        resultsContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error searching:', error);
    }
}

function populateUpdateSelect() {
    const select = document.getElementById('updateSelectStudent');
    select.innerHTML = '<option value="">-- Select a student --</option>';
    
    allStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `ID ${student.id} - ${student.name} (${student.grade} - ${student.marks}%)`;
        select.appendChild(option);
    });
}

function loadStudentForUpdate() {
    const select = document.getElementById('updateSelectStudent');
    const studentId = parseInt(select.value);
    const container = document.getElementById('updateFormContainer');
    
    if (!studentId) {
        container.style.display = 'none';
        return;
    }
    
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    currentStudent = student;
    
    const currentInfo = document.getElementById('currentInfo');
    currentInfo.innerHTML = `
        <h4>📋 Current Information</h4>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">ID</span>
                <span class="info-value">${student.id}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Name</span>
                <span class="info-value">${student.name}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Age</span>
                <span class="info-value">${student.age}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Grade</span>
                <span class="info-value">${student.grade}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Marks</span>
                <span class="info-value">${student.marks}%</span>
            </div>
        </div>
    `;
    
    document.getElementById('updateId').value = '';
    document.getElementById('updateName').value = '';
    document.getElementById('updateAge').value = '';
    document.getElementById('updateGrade').value = '';
    document.getElementById('updateMarks').value = '';
    
    container.style.display = 'block';
}

async function handleUpdateStudent(e) {
    e.preventDefault();
    
    if (!currentStudent) {
        showToast('Please select a student first', 'error');
        return;
    }
    
    const newData = {
        id: document.getElementById('updateId').value ? parseInt(document.getElementById('updateId').value) : currentStudent.id,
        name: document.getElementById('updateName').value.trim() || currentStudent.name,
        age: document.getElementById('updateAge').value ? parseInt(document.getElementById('updateAge').value) : currentStudent.age,
        grade: document.getElementById('updateGrade').value || currentStudent.grade,
        marks: document.getElementById('updateMarks').value ? parseInt(document.getElementById('updateMarks').value) : currentStudent.marks
    };
    
    try {
        const result = await apiRequest(`/students/${currentStudent.id}`, 'PUT', newData);
        
        showToast(result.message, 'success');
        
        document.getElementById('updateSelectStudent').value = '';
        document.getElementById('updateFormContainer').style.display = 'none';
        currentStudent = null;
        
        await refreshData();
        populateUpdateSelect();
        
    } catch (error) {
        console.error('Error updating student:', error);
    }
}

function cancelUpdate() {
    document.getElementById('updateSelectStudent').value = '';
    document.getElementById('updateFormContainer').style.display = 'none';
    currentStudent = null;
}

function populateDeleteSelect() {
    const select = document.getElementById('deleteSelectStudent');
    select.innerHTML = '<option value="">-- Select a student --</option>';
    
    allStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `ID ${student.id} - ${student.name} (${student.grade} - ${student.marks}%)`;
        select.appendChild(option);
    });
}

function loadStudentForDelete() {
    const select = document.getElementById('deleteSelectStudent');
    const studentId = parseInt(select.value);
    const container = document.getElementById('deleteConfirmContainer');
    
    if (!studentId) {
        container.style.display = 'none';
        return;
    }
    
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    currentStudent = student;
    
    const infoCard = document.getElementById('deleteStudentInfo');
    infoCard.innerHTML = `
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">ID</span>
                <span class="info-value">${student.id}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Name</span>
                <span class="info-value">${student.name}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Age</span>
                <span class="info-value">${student.age}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Grade</span>
                <span class="info-value">${student.grade}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Marks</span>
                <span class="info-value">${student.marks}%</span>
            </div>
        </div>
    `;
    
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
        
        document.getElementById('deleteSelectStudent').value = '';
        document.getElementById('deleteConfirmContainer').style.display = 'none';
        currentStudent = null;
        
        await refreshData();
        populateDeleteSelect();
        
    } catch (error) {
        console.error('Error deleting student:', error);
    }
}

function cancelDelete() {
    document.getElementById('deleteSelectStudent').value = '';
    document.getElementById('deleteConfirmContainer').style.display = 'none';
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
        
        document.getElementById('analyticsTotal').textContent = analytics.total_students;
        document.getElementById('analyticsAvg').textContent = analytics.average_marks;
        document.getElementById('analyticsPass').textContent = analytics.pass_percentage + '%';
        document.getElementById('analyticsHigh').textContent = analytics.highest_marks;
        
        if (analytics.top_performer) {
            document.getElementById('topPerformer').textContent = analytics.top_performer.name;
            document.getElementById('topPerformerMarks').textContent = analytics.top_performer.marks + ' marks';
        }
        
        document.getElementById('belowAvgCount').textContent = analytics.below_average_count + ' students';
        
        updateAnalyticsCharts(analytics);
        
        updateExcellenceList(analytics.excellence_students);
        
        updateDetailedStats(analytics);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function clearAnalytics() {
    document.getElementById('analyticsTotal').textContent = '0';
    document.getElementById('analyticsAvg').textContent = '0';
    document.getElementById('analyticsPass').textContent = '0%';
    document.getElementById('analyticsHigh').textContent = '0';
    document.getElementById('topPerformer').textContent = '-';
    document.getElementById('topPerformerMarks').textContent = '0 marks';
    document.getElementById('belowAvgCount').textContent = '0 students';
    
    const excellenceList = document.getElementById('excellenceList');
    if (excellenceList) {
        excellenceList.innerHTML = '<p style="text-align:center;padding:20px;color:#6b7280;">No data available</p>';
    }
}

function updateAnalyticsCharts(analytics) {
    const gradeCtx = document.getElementById('gradeChart');
    if (gradeCtx) {
        if (window.gradeChartInstance) {
            window.gradeChartInstance.destroy();
        }
        
        window.gradeChartInstance = new Chart(gradeCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(analytics.grade_distribution),
                datasets: [{
                    label: 'Number of Students',
                    data: Object.values(analytics.grade_distribution),
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
    
    const passFailCtx = document.getElementById('passFailChart');
    if (passFailCtx) {
        if (window.passFailChartInstance) {
            window.passFailChartInstance.destroy();
        }
        
        window.passFailChartInstance = new Chart(passFailCtx, {
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
    
    const ageGroupCtx = document.getElementById('ageGroupChart');
    if (ageGroupCtx) {
        if (window.ageGroupChartInstance) {
            window.ageGroupChartInstance.destroy();
        }
        
        const ageData = analytics.age_group_performance;
        const ageLabels = Object.keys(ageData).filter(k => ageData[k] > 0);
        const ageValues = ageLabels.map(k => ageData[k]);
        
        if (ageValues.length > 0) {
            window.ageGroupChartInstance = new Chart(ageGroupCtx, {
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
    }
}

function updateExcellenceList(excellentStudents) {
    const container = document.getElementById('excellenceList');
    
    if (excellentStudents.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#6b7280;">No students with 90+ marks yet</p>';
        return;
    }
    
    let html = '<div class="stats-list">';
    excellentStudents.forEach(student => {
        html += `
            <div class="stat-row">
                <span>🌟 ${student.name}</span>
                <strong style="color: #10b981">${student.marks}%</strong>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function updateDetailedStats(analytics) {
    const table = document.getElementById('detailedStatsTable');
    
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
    
    let html = `
        <thead>
            <tr>
                <th>Metric</th>
                <th>Value</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    stats.forEach(([metric, value]) => {
        html += `
            <tr>
                <td>${metric}</td>
                <td><strong>${value}</strong></td>
            </tr>
        `;
    });
    
    html += '</tbody>';
    table.innerHTML = html;
}
function displaySearchResults(students) {
    const resultsContainer = document.getElementById('searchResults');
    const query = document.getElementById('searchInput').value.trim();
    
    if (students.length === 0) {
        resultsContainer.innerHTML = `<div class="empty-state"><span class="empty-icon">😞</span><p>No students found matching "${query}"</p></div>`;
        return;
    }
    
    let html = `
        <div class="table-header">
            <span class="table-count">Found: ${students.length} student(s)</span>
        </div>
        <table class="modern-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Grade</th>
                    <th>Marks</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    students.forEach(student => {
        const marksColor = getMarksColor(student.marks);
        html += `
            <tr>
                <td><strong>${student.id}</strong></td>
                <td>${student.name}</td>
                <td>${student.age}</td>
                <td><span class="grade-badge grade-${student.grade}">${student.grade}</span></td>
                <td><span class="marks-badge" style="background: ${marksColor}">${student.marks}%</span></td>
                <td>
                    <button onclick='showPrintPreview(${JSON.stringify(student)})' class="btn-icon" title="Print Result">
                        🖨️
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    resultsContainer.innerHTML = html;
}

async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!query) {
        resultsContainer.innerHTML = '<div class="empty-state"><span class="empty-icon">🔍</span><p>Enter a search query to find students</p></div>';
        return;
    }
    
    try {
        const response = await apiRequest('/students/search', 'POST', { query });
        const students = response.students;
        
        displaySearchResults(students);
        
    } catch (error) {
        console.error('Error searching:', error);
    }
}

function showPrintPreview(student) {
    const modal = document.getElementById('printModal');
    const printContent = document.getElementById('printContent');
    
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
                        <span class="info-val">${student.name}</span>
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
    document.getElementById('printModal').style.display = 'none';
}