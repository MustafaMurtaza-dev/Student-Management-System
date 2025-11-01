import streamlit as st
import pandas as pd
import os
from typing import List, Dict, Optional, Tuple
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import numpy as np

DATA_FILE = "students.txt"
VALID_GRADES = ["A+", "A", "B+", "B", "C+", "C", "D", "F"]

st.set_page_config(
    page_title="AI-Powered Student Management",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

def inject_custom_css():
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        * {
            font-family: 'Poppins', sans-serif;
        }
        
        .main {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background-attachment: fixed;
        }
        
        .stApp {
            background: transparent;
        }
        
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, #1e3c72 0%, #2a5298 100%);
        }
        
        [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p {
            color: white;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.3s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .glass-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.18);
            margin: 20px 0;
        }
        
        .stButton>button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 15px;
            padding: 15px 30px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .stButton>button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        
        .stTextInput>div>div>input, .stNumberInput>div>div>input {
            border-radius: 10px;
            border: 2px solid #e0e0e0;
            padding: 10px;
            transition: all 0.3s ease;
        }
        
        .stTextInput>div>div>input:focus, .stNumberInput>div>div>input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .stSelectbox>div>div>div {
            border-radius: 10px;
        }
        
        h1 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
            font-size: 3.5rem !important;
            text-align: center;
            margin-bottom: 30px;
        }
        
        h2, h3 {
            color: #2d3748;
            font-weight: 700;
        }
        
        .stMetric {
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .stMetric label {
            color: #667eea !important;
            font-weight: 600 !important;
        }
        
        .stMetric [data-testid="stMetricValue"] {
            color: #2d3748;
            font-size: 2rem;
            font-weight: 700;
        }
        
        [data-testid="stExpander"] {
            background: white;
            border-radius: 15px;
            border: 2px solid #e0e0e0;
        }
        
        .stDataFrame {
            border-radius: 15px;
            overflow: hidden;
        }
        
        .ai-badge {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            display: inline-block;
            margin-left: 10px;
        }
        
        .success-animation {
            animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .stTabs [data-baseweb="tab-list"] {
            gap: 10px;
            background: transparent;
        }
        
        .stTabs [data-baseweb="tab"] {
            background: white;
            border-radius: 10px;
            padding: 10px 20px;
            font-weight: 600;
        }
        
        .stTabs [aria-selected="true"] {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        </style>
    """, unsafe_allow_html=True)

def load_students() -> List[Dict]:
    students = []
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            pass
        return students
    
    try:
        with open(DATA_FILE, 'r') as f:
            lines = f.readlines()
            
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
                
            try:
                parts = line.split(',')
                if len(parts) != 5:
                    continue
                
                student = {
                    'id': int(parts[0]),
                    'name': parts[1],
                    'age': int(parts[2]),
                    'grade': parts[3],
                    'marks': int(parts[4])
                }
                students.append(student)
                
            except (ValueError, IndexError):
                continue
                
    except Exception as e:
        st.error(f"Error loading students: {str(e)}")
        
    return students

def save_students(students: List[Dict]) -> bool:
    try:
        with open(DATA_FILE, 'w') as f:
            for student in students:
                line = f"{student['id']},{student['name']},{student['age']},{student['grade']},{student['marks']}\n"
                f.write(line)
        return True
    except Exception as e:
        st.error(f"Error saving students: {str(e)}")
        return False

def validate_id(student_id: int, existing_students: List[Dict], updating_id: Optional[int] = None) -> Tuple[bool, str]:
    if not isinstance(student_id, int) or student_id <= 0:
        return False, "ID must be a positive integer"
    
    for student in existing_students:
        if student['id'] == student_id and student_id != updating_id:
            return False, f"ID {student_id} already exists"
    
    return True, ""

def validate_name(name: str) -> Tuple[bool, str]:
    if not name or not name.strip():
        return False, "Name cannot be empty"
    
    if any(char.isdigit() for char in name):
        return False, "Name cannot contain numbers"
    
    if len(name.strip()) < 2:
        return False, "Name must be at least 2 characters"
    
    return True, ""

def validate_age(age: int) -> Tuple[bool, str]:
    if not isinstance(age, int):
        return False, "Age must be an integer"
    
    if age < 5 or age > 30:
        return False, "Age must be between 5 and 30"
    
    return True, ""

def validate_grade(grade: str) -> Tuple[bool, str]:
    if not grade:
        return False, "Grade cannot be empty"
    
    if grade not in VALID_GRADES:
        return False, f"Grade must be one of: {', '.join(VALID_GRADES)}"
    
    return True, ""

def validate_marks(marks: int) -> Tuple[bool, str]:
    if not isinstance(marks, int):
        return False, "Marks must be an integer"
    
    if marks < 0 or marks > 100:
        return False, "Marks must be between 0 and 100"
    
    return True, ""

def validate_student_data(student_data: Dict, existing_students: List[Dict], updating_id: Optional[int] = None) -> Tuple[bool, List[str]]:
    errors = []
    
    is_valid, error = validate_id(student_data['id'], existing_students, updating_id)
    if not is_valid:
        errors.append(error)
    
    is_valid, error = validate_name(student_data['name'])
    if not is_valid:
        errors.append(error)
    
    is_valid, error = validate_age(student_data['age'])
    if not is_valid:
        errors.append(error)
    
    is_valid, error = validate_grade(student_data['grade'])
    if not is_valid:
        errors.append(error)
    
    is_valid, error = validate_marks(student_data['marks'])
    if not is_valid:
        errors.append(error)
    
    return len(errors) == 0, errors

def add_student(student_data: Dict) -> bool:
    students = load_students()
    
    is_valid, errors = validate_student_data(student_data, students)
    if not is_valid:
        for error in errors:
            st.error(f"❌ {error}")
        return False
    
    students.append(student_data)
    
    if save_students(students):
        return True
    return False

def update_student(student_id: int, new_data: Dict) -> bool:
    students = load_students()
    
    student_index = None
    for i, student in enumerate(students):
        if student['id'] == student_id:
            student_index = i
            break
    
    if student_index is None:
        st.error(f"Student with ID {student_id} not found")
        return False
    
    is_valid, errors = validate_student_data(new_data, students, updating_id=student_id)
    if not is_valid:
        for error in errors:
            st.error(f"❌ {error}")
        return False
    
    students[student_index] = new_data
    
    if save_students(students):
        return True
    return False

def delete_student(student_id: int) -> bool:
    students = load_students()
    
    original_count = len(students)
    students = [s for s in students if s['id'] != student_id]
    
    if len(students) == original_count:
        st.error(f"Student with ID {student_id} not found")
        return False
    
    if save_students(students):
        return True
    return False

def get_student_by_id(student_id: int) -> Optional[Dict]:
    students = load_students()
    
    for student in students:
        if student['id'] == student_id:
            return student
    
    return None

def is_id_unique(student_id: int) -> bool:
    students = load_students()
    
    for student in students:
        if student['id'] == student_id:
            return False
    
    return True

def search_students(query: str) -> List[Dict]:
    if not query:
        return load_students()
    
    students = load_students()
    query_lower = query.lower().strip()
    
    results = []
    for student in students:
        if str(student['id']) == query_lower:
            results.append(student)
        elif query_lower in student['name'].lower():
            results.append(student)
    
    return results

def ai_predict_grade(marks: int) -> str:
    if marks >= 90:
        return "A+"
    elif marks >= 85:
        return "A"
    elif marks >= 80:
        return "B+"
    elif marks >= 70:
        return "B"
    elif marks >= 60:
        return "C+"
    elif marks >= 50:
        return "C"
    elif marks >= 40:
        return "D"
    else:
        return "F"

def ai_performance_prediction(student: Dict) -> Dict:
    current_marks = student['marks']
    age = student['age']
    
    potential_improvement = 0
    if current_marks < 50:
        potential_improvement = np.random.randint(10, 20)
    elif current_marks < 70:
        potential_improvement = np.random.randint(5, 15)
    else:
        potential_improvement = np.random.randint(2, 10)
    
    predicted_marks = min(100, current_marks + potential_improvement)
    
    risk_level = "Low"
    if current_marks < 40:
        risk_level = "High"
    elif current_marks < 60:
        risk_level = "Medium"
    
    return {
        'current_marks': current_marks,
        'predicted_marks': predicted_marks,
        'improvement_potential': potential_improvement,
        'risk_level': risk_level,
        'recommended_action': ai_get_recommendation(current_marks, risk_level)
    }

def ai_get_recommendation(marks: int, risk_level: str) -> str:
    if risk_level == "High":
        return "🚨 Immediate intervention required. Schedule one-on-one tutoring sessions."
    elif risk_level == "Medium":
        return "⚠️ Monitor closely. Provide additional study materials and support."
    else:
        return "✅ Performing well. Encourage to maintain current study habits."

def ai_detect_anomalies(students: List[Dict]) -> List[Dict]:
    if len(students) < 3:
        return []
    
    marks_list = [s['marks'] for s in students]
    mean_marks = np.mean(marks_list)
    std_marks = np.std(marks_list)
    
    anomalies = []
    for student in students:
        z_score = abs((student['marks'] - mean_marks) / std_marks) if std_marks > 0 else 0
        if z_score > 2:
            anomalies.append({
                'student': student,
                'z_score': z_score,
                'type': 'Exceptional' if student['marks'] > mean_marks else 'Needs Attention'
            })
    
    return anomalies

def analyze_data(students: List[Dict]) -> Dict:
    if not students:
        return {
            'total_students': 0,
            'average_marks': 0,
            'top_performer': None,
            'top_performer_marks': 0,
            'lowest_performer': None,
            'lowest_performer_marks': 0,
            'highest_marks': 0,
            'lowest_marks': 0,
            'below_average_count': 0,
            'grade_distribution': {},
            'age_distribution': {},
            'average_marks_per_grade': {},
            'pass_rate': 0,
            'top_5_students': [],
            'excellence_rate': 0,
            'median_marks': 0
        }
    
    total_marks = sum(s['marks'] for s in students)
    average_marks = total_marks / len(students)
    
    top_student = max(students, key=lambda s: s['marks'])
    lowest_student = min(students, key=lambda s: s['marks'])
    
    below_average_count = sum(1 for s in students if s['marks'] < average_marks)
    
    grade_distribution = {}
    for grade in VALID_GRADES:
        grade_distribution[grade] = sum(1 for s in students if s['grade'] == grade)
    
    age_distribution = {
        '5-10': 0,
        '11-15': 0,
        '16-20': 0,
        '21-25': 0,
        '26-30': 0
    }
    
    for student in students:
        age = student['age']
        if 5 <= age <= 10:
            age_distribution['5-10'] += 1
        elif 11 <= age <= 15:
            age_distribution['11-15'] += 1
        elif 16 <= age <= 20:
            age_distribution['16-20'] += 1
        elif 21 <= age <= 25:
            age_distribution['21-25'] += 1
        elif 26 <= age <= 30:
            age_distribution['26-30'] += 1
    
    average_marks_per_grade = {}
    for grade in VALID_GRADES:
        grade_students = [s for s in students if s['grade'] == grade]
        if grade_students:
            avg = sum(s['marks'] for s in grade_students) / len(grade_students)
            average_marks_per_grade[grade] = round(avg, 2)
        else:
            average_marks_per_grade[grade] = 0
    
    pass_count = sum(1 for s in students if s['marks'] >= 40)
    pass_rate = (pass_count / len(students)) * 100
    
    excellence_count = sum(1 for s in students if s['marks'] >= 85)
    excellence_rate = (excellence_count / len(students)) * 100
    
    marks_sorted = sorted([s['marks'] for s in students])
    median_marks = marks_sorted[len(marks_sorted)//2]
    
    top_5_students = sorted(students, key=lambda s: s['marks'], reverse=True)[:5]
    
    return {
        'total_students': len(students),
        'average_marks': round(average_marks, 2),
        'top_performer': top_student['name'],
        'top_performer_marks': top_student['marks'],
        'lowest_performer': lowest_student['name'],
        'lowest_performer_marks': lowest_student['marks'],
        'highest_marks': top_student['marks'],
        'lowest_marks': lowest_student['marks'],
        'below_average_count': below_average_count,
        'grade_distribution': grade_distribution,
        'age_distribution': age_distribution,
        'average_marks_per_grade': average_marks_per_grade,
        'pass_rate': round(pass_rate, 2),
        'top_5_students': top_5_students,
        'excellence_rate': round(excellence_rate, 2),
        'median_marks': median_marks
    }

def initialize_session_state():
    if 'first_load' not in st.session_state:
        st.session_state.first_load = True
    if 'edit_student_id' not in st.session_state:
        st.session_state.edit_student_id = None
    if 'theme' not in st.session_state:
        st.session_state.theme = 'light'

def show_welcome_popup():
    if st.session_state.first_load:
        st.balloons()
        st.toast("🎓 AI-Powered Student Management System", icon="✨")
        st.toast("Made By Hafiz Mustafa Murtaza", icon="👨‍💻")
        st.session_state.first_load = False

def students_to_dataframe(students: List[Dict]) -> pd.DataFrame:
    if not students:
        return pd.DataFrame(columns=['ID', 'Name', 'Age', 'Grade', 'Marks'])
    
    df = pd.DataFrame(students)
    df = df.rename(columns={
        'id': 'ID',
        'name': 'Name',
        'age': 'Age',
        'grade': 'Grade',
        'marks': 'Marks'
    })
    df = df[['ID', 'Name', 'Age', 'Grade', 'Marks']]
    return df

def render_home_page():
    st.markdown('<h1>🎓 AI-Powered Student Management System <span class="ai-badge">AI Enhanced</span></h1>', unsafe_allow_html=True)
    
    show_welcome_popup()
    
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("""
    ### 🚀 Welcome to the Future of Student Management
    
    Experience cutting-edge AI technology combined with intuitive design for comprehensive student record management.
    
    **🌟 Revolutionary Features:**
    - 🤖 **AI-Powered Predictions** - Smart performance forecasting
    - 📊 **Advanced Analytics** - Deep insights with interactive visualizations
    - 🎯 **Anomaly Detection** - Automatic identification of exceptional cases
    - ⚡ **Real-time Processing** - Instant data updates and validation
    - 🎨 **Beautiful Interface** - Modern, intuitive design
    """)
    st.markdown('</div>', unsafe_allow_html=True)
    
    students = load_students()
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "👥 Total Students",
            len(students),
            delta=f"+{len(students)} enrolled",
            delta_color="normal"
        )
    
    with col2:
        if students:
            avg_marks = sum(s['marks'] for s in students) / len(students)
            st.metric(
                "📈 Average Score",
                f"{avg_marks:.1f}%",
                delta=f"{avg_marks - 75:.1f}% vs benchmark",
                delta_color="normal" if avg_marks >= 75 else "inverse"
            )
        else:
            st.metric("📈 Average Score", "0%")
    
    with col3:
        if students:
            top_student = max(students, key=lambda s: s['marks'])
            st.metric(
                "🏆 Highest Score",
                f"{top_student['marks']}%",
                delta=top_student['name'][:15],
                delta_color="off"
            )
        else:
            st.metric("🏆 Highest Score", "0%")
    
    with col4:
        if students:
            pass_count = sum(1 for s in students if s['marks'] >= 40)
            pass_rate = (pass_count / len(students)) * 100
            st.metric(
                "✅ Pass Rate",
                f"{pass_rate:.1f}%",
                delta=f"{pass_count}/{len(students)} passing",
                delta_color="normal"
            )
        else:
            st.metric("✅ Pass Rate", "0%")
    
    if students:
        st.markdown("---")
        st.markdown("### 🤖 AI-Powered Quick Insights")
        
        col1, col2 = st.columns(2)
        
        with col1:
            anomalies = ai_detect_anomalies(students)
            if anomalies:
                st.markdown('<div class="glass-card">', unsafe_allow_html=True)
                st.markdown("#### 🎯 Performance Anomalies Detected")
                for anomaly in anomalies[:3]:
                    status = "🌟" if anomaly['type'] == 'Exceptional' else "⚠️"
                    st.markdown(f"{status} **{anomaly['student']['name']}** - {anomaly['type']} ({anomaly['student']['marks']}%)")
                st.markdown('</div>', unsafe_allow_html=True)
        
        with col2:
            analysis = analyze_data(students)
            st.markdown('<div class="glass-card">', unsafe_allow_html=True)
            st.markdown("#### 📊 Performance Distribution")
            fig = go.Figure(data=[go.Pie(
                labels=['Excellent (≥85)', 'Good (70-84)', 'Average (40-69)', 'Needs Improvement (<40)'],
                values=[
                    sum(1 for s in students if s['marks'] >= 85),
                    sum(1 for s in students if 70 <= s['marks'] < 85),
                    sum(1 for s in students if 40 <= s['marks'] < 70),
                    sum(1 for s in students if s['marks'] < 40)
                ],
                hole=0.4,
                marker_colors=['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
            )])
            fig.update_layout(height=300, margin=dict(t=0, b=0, l=0, r=0), showlegend=True)
            st.plotly_chart(fig, use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("""
    ### 🎯 Navigation Guide
    
    Use the sidebar to access different features:
    
    1. **🏠 Home** - Overview and quick insights
    2. **➕ Add Student** - Register new students with AI grade prediction
    3. **📚 Manage Students** - Advanced search, update, and delete operations
    4. **📊 AI Analytics** - Comprehensive data analysis with ML predictions
    
    **Made with ❤️ by Hafiz Mustafa Murtaza**
    """)
    st.markdown('</div>', unsafe_allow_html=True)

def render_add_student_page():
    st.markdown('<h1>➕ Add New Student</h1>', unsafe_allow_html=True)
    
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    
    students = load_students()
    
    with st.form("add_student_form", clear_on_submit=True):
        st.markdown("### 📝 Student Information")
        
        col1, col2 = st.columns(2)
        
        with col1:
            student_id = st.number_input(
                "🆔 Student ID",
                min_value=1,
                max_value=999999,
                step=1,
                help="Unique identifier for the student"
            )
            
            name = st.text_input(
                "👤 Full Name",
                max_chars=100,
                placeholder="Enter student's full name",
                help="Student's full name (no numbers allowed)"
            )
            
            age = st.number_input(
                "🎂 Age",
                min_value=5,
                max_value=30,
                value=15,
                step=1,
                help="Student's age (5-30)"
            )
        
        with col2:
            marks = st.slider(
                "📊 Marks",
                min_value=0,
                max_value=100,
                value=50,
                help="Student's marks (0-100)"
            )
            
            predicted_grade = ai_predict_grade(marks)
            st.markdown(f"### 🤖 AI Predicted Grade: **{predicted_grade}**")
            
            grade = st.selectbox(
                "🎓 Confirm Grade",
                options=VALID_GRADES,
                index=VALID_GRADES.index(predicted_grade) if predicted_grade in VALID_GRADES else 0,
                help="AI suggested grade based on marks"
            )
        
        submitted = st.form_submit_button("✅ Add Student", use_container_width=True, type="primary")
        
        if submitted:
            student_data = {
                'id': student_id,
                'name': name.strip(),
                'age': age,
                'grade': grade,
                'marks': marks
            }
            
            if add_student(student_data):
                st.success(f"✅ Student **{name}** added successfully!")
                st.balloons()
                
                prediction = ai_performance_prediction(student_data)
                st.info(f"🤖 AI Insight: {prediction['recommended_action']}")
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### 🔍 Quick ID Availability Check")
    
    col1, col2 = st.columns([2, 1])
    with col1:
        check_id = st.number_input("Enter ID to check", min_value=1, step=1, key="check_id")
    
    with col2:
        st.markdown("<br>", unsafe_allow_html=True)
        if check_id:
            if is_id_unique(check_id):
                st.success(f"✅ Available")
            else:
                st.error(f"❌ In Use")
    
    st.markdown('</div>', unsafe_allow_html=True)

def render_manage_students_page():
    st.markdown('<h1>📚 Manage Students</h1>', unsafe_allow_html=True)
    
    students = load_students()
    
    if not students:
        st.info("📭 No students found. Add your first student to get started!")
        return
    
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### 🔍 Search & Filter")
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        search_query = st.text_input(
            "Search by Name or ID",
            placeholder="🔎 Type to search...",
            label_visibility="collapsed"
        )
    
    with col2:
        filter_grade = st.selectbox("Filter by Grade", ["All"] + VALID_GRADES)
    
    filtered_students = search_students(search_query)
    
    if filter_grade != "All":
        filtered_students = [s for s in filtered_students if s['grade'] == filter_grade]
    
    if search_query or filter_grade != "All":
        st.caption(f"📊 Found {len(filtered_students)} student(s)")
    else:
        st.caption(f"📊 Showing all {len(filtered_students)} student(s)")
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    if not filtered_students:
        st.warning("⚠️ No students match your search criteria.")
        return
    
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### 📊 Student Records")
    
    df = students_to_dataframe(filtered_students)
    
    df_styled = df.style.background_gradient(subset=['Marks'], cmap='RdYlGn', vmin=0, vmax=100)
    st.dataframe(df_styled, use_container_width=True, hide_index=True)
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### ✏️ Update or Delete Student")
    
    student_options = {f"ID {s['id']} - {s['name']} ({s['grade']} - {s['marks']}%)": s['id'] for s in filtered_students}
    selected_student_label = st.selectbox(
        "Select a student",
        options=list(student_options.keys())
    )
    
    if selected_student_label:
        selected_id = student_options[selected_student_label]
        selected_student = get_student_by_id(selected_id)
        
        if selected_student:
            with st.expander("📋 Current Information", expanded=True):
                col1, col2, col3, col4, col5 = st.columns(5)
                with col1:
                    st.metric("🆔 ID", selected_student['id'])
                with col2:
                    st.metric("👤 Name", selected_student['name'])
                with col3:
                    st.metric("🎂 Age", selected_student['age'])
                with col4:
                    st.metric("🎓 Grade", selected_student['grade'])
                with col5:
                    st.metric("📊 Marks", f"{selected_student['marks']}%")
                
                st.markdown("---")
                prediction = ai_performance_prediction(selected_student)
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("🎯 Predicted Marks", f"{prediction['predicted_marks']}%", 
                             delta=f"+{prediction['improvement_potential']}%")
                with col2:
                    risk_color = {"Low": "🟢", "Medium": "🟡", "High": "🔴"}
                    st.metric("⚠️ Risk Level", f"{risk_color[prediction['risk_level']]} {prediction['risk_level']}")
                with col3:
                    st.info(f"💡 {prediction['recommended_action']}")
            
            tab1, tab2 = st.tabs(["✏️ Update Student", "🗑️ Delete Student"])
            
            with tab1:
                with st.form(f"update_form_{selected_id}"):
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        new_id = st.number_input("Student ID", min_value=1, value=selected_student['id'], step=1)
                        new_name = st.text_input("Full Name", value=selected_student['name'], max_chars=100)
                        new_age = st.number_input("Age", min_value=5, max_value=30, value=selected_student['age'], step=1)
                    
                    with col2:
                        new_marks = st.slider("Marks", min_value=0, max_value=100, value=selected_student['marks'])
                        new_predicted = ai_predict_grade(new_marks)
                        st.markdown(f"**🤖 AI Predicted: {new_predicted}**")
                        new_grade = st.selectbox("Grade", options=VALID_GRADES, 
                                                index=VALID_GRADES.index(selected_student['grade']))
                    
                    if st.form_submit_button("💾 Save Changes", use_container_width=True, type="primary"):
                        new_data = {
                            'id': new_id,
                            'name': new_name.strip(),
                            'age': new_age,
                            'grade': new_grade,
                            'marks': new_marks
                        }
                        
                        if update_student(selected_student['id'], new_data):
                            st.success(f"✅ Student **{new_name}** updated successfully!")
                            st.rerun()
            
            with tab2:
                st.warning(f"⚠️ Delete **{selected_student['name']}** (ID: {selected_student['id']})?")
                st.error("**This action cannot be undone!**")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    if st.button("🗑️ Confirm Delete", type="primary", use_container_width=True):
                        if delete_student(selected_student['id']):
                            st.success(f"✅ Student deleted successfully!")
                            st.rerun()
                
                with col2:
                    if st.button("❌ Cancel", use_container_width=True):
                        st.info("Cancelled")
    
    st.markdown('</div>', unsafe_allow_html=True)

def render_analytics_page():
    st.markdown('<h1>📊 AI-Powered Analytics Dashboard <span class="ai-badge">ML Powered</span></h1>', unsafe_allow_html=True)
    
    students = load_students()
    
    if not students:
        st.info("📭 No data available. Add students to see AI-powered insights!")
        return
    
    analysis = analyze_data(students)
    
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### 📈 Key Performance Indicators")
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("👥 Students", analysis['total_students'])
    
    with col2:
        st.metric("📊 Avg Score", f"{analysis['average_marks']}%")
    
    with col3:
        st.metric("✅ Pass Rate", f"{analysis['pass_rate']}%")
    
    with col4:
        st.metric("🌟 Excellence", f"{analysis['excellence_rate']}%")
    
    with col5:
        st.metric("📈 Median", f"{analysis['median_marks']}%")
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.markdown("#### 🏆 Top Performer")
        st.success(f"**{analysis['top_performer']}**")
        st.markdown(f"Score: **{analysis['top_performer_marks']}%**")
        st.markdown('</div>', unsafe_allow_html=True)
    
    with col2:
        st.markdown('<div class="glass-card">', unsafe_allow_html=True)
        st.markdown("#### 📉 Needs Support")
        st.warning(f"**{analysis['lowest_performer']}**")
        st.markdown(f"Score: **{analysis['lowest_performer_marks']}%**")
        st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### 📊 Interactive Visualizations")
    
    tab1, tab2, tab3, tab4 = st.tabs(["📊 Grade Distribution", "🏆 Top Performers", "📈 Age Analysis", "🤖 AI Predictions"])
    
    with tab1:
        fig = px.bar(
            x=list(analysis['grade_distribution'].keys()),
            y=list(analysis['grade_distribution'].values()),
            labels={'x': 'Grade', 'y': 'Number of Students'},
            title='Grade Distribution',
            color=list(analysis['grade_distribution'].values()),
            color_continuous_scale='viridis'
        )
        fig.update_layout(height=400, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)
        
        avg_grade_data = {k: v for k, v in analysis['average_marks_per_grade'].items() if v > 0}
        if avg_grade_data:
            fig2 = px.line(
                x=list(avg_grade_data.keys()),
                y=list(avg_grade_data.values()),
                labels={'x': 'Grade', 'y': 'Average Marks'},
                title='Average Marks per Grade',
                markers=True
            )
            fig2.update_layout(height=300)
            st.plotly_chart(fig2, use_container_width=True)
    
    with tab2:
        if analysis['top_5_students']:
            top5_data = pd.DataFrame([
                {'Student': s['name'], 'Marks': s['marks'], 'Grade': s['grade']}
                for s in analysis['top_5_students']
            ])
            
            fig = px.bar(
                top5_data,
                x='Student',
                y='Marks',
                color='Marks',
                title='Top 5 Students',
                color_continuous_scale='blues',
                text='Grade'
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
            
            st.dataframe(top5_data, use_container_width=True, hide_index=True)
    
    with tab3:
        age_data = {k: v for k, v in analysis['age_distribution'].items() if v > 0}
        if age_data:
            fig = px.pie(
                values=list(age_data.values()),
                names=list(age_data.keys()),
                title='Age Distribution',
                hole=0.4
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
    
    with tab4:
        st.markdown("#### 🤖 AI Performance Predictions")
        
        predictions = []
        for student in students[:10]:
            pred = ai_performance_prediction(student)
            predictions.append({
                'Student': student['name'],
                'Current': pred['current_marks'],
                'Predicted': pred['predicted_marks'],
                'Improvement': pred['improvement_potential'],
                'Risk': pred['risk_level']
            })
        
        pred_df = pd.DataFrame(predictions)
        
        fig = go.Figure()
        fig.add_trace(go.Bar(name='Current Marks', x=pred_df['Student'], y=pred_df['Current'], marker_color='lightblue'))
        fig.add_trace(go.Bar(name='Predicted Marks', x=pred_df['Student'], y=pred_df['Predicted'], marker_color='darkblue'))
        fig.update_layout(height=400, title='Current vs Predicted Performance', barmode='group')
        st.plotly_chart(fig, use_container_width=True)
        
        st.dataframe(pred_df, use_container_width=True, hide_index=True)
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### 🎯 AI Anomaly Detection")
    
    anomalies = ai_detect_anomalies(students)
    if anomalies:
        for anomaly in anomalies:
            status_color = "success" if anomaly['type'] == 'Exceptional' else "warning"
            with st.expander(f"{anomaly['student']['name']} - {anomaly['type']}", expanded=True):
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Marks", f"{anomaly['student']['marks']}%")
                with col2:
                    st.metric("Z-Score", f"{anomaly['z_score']:.2f}")
                with col3:
                    st.metric("Status", anomaly['type'])
    else:
        st.info("No significant anomalies detected. All students performing within normal range.")
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown('<div class="glass-card">', unsafe_allow_html=True)
    st.markdown("### 📋 Detailed Statistics")
    
    stats_data = {
        'Metric': ['Total Students', 'Average Marks', 'Median Marks', 'Highest Marks', 
                   'Lowest Marks', 'Pass Rate', 'Excellence Rate', 'Below Average'],
        'Value': [
            analysis['total_students'],
            f"{analysis['average_marks']}%",
            f"{analysis['median_marks']}%",
            f"{analysis['highest_marks']}%",
            f"{analysis['lowest_marks']}%",
            f"{analysis['pass_rate']}%",
            f"{analysis['excellence_rate']}%",
            analysis['below_average_count']
        ]
    }
    
    stats_df = pd.DataFrame(stats_data)
    st.dataframe(stats_df, use_container_width=True, hide_index=True)
    
    st.markdown('</div>', unsafe_allow_html=True)

def main():
    inject_custom_css()
    initialize_session_state()
    
    with st.sidebar:
        st.markdown("""
            <div style='text-align: center; padding: 20px;'>
                <h1 style='color: white; font-size: 1.5rem;'>🎓 SMS</h1>
                <p style='color: #a0aec0; font-size: 0.9rem;'>AI-Powered System</p>
            </div>
        """, unsafe_allow_html=True)
        
        page = st.radio(
            "Navigation",
            ["🏠 Home", "➕ Add Student", "📚 Manage Students", "📊 AI Analytics"],
            label_visibility="collapsed"
        )
        
        st.markdown("---")
        
        students = load_students()
        st.metric("📊 Total Records", len(students))
        
        if students:
            avg = sum(s['marks'] for s in students) / len(students)
            st.metric("📈 Avg. Score", f"{avg:.1f}%")
        
        st.markdown("---")
        
        st.markdown("""
            <div style='text-align: center; color: white; padding: 20px;'>
                <p style='font-size: 0.8rem; margin: 5px 0;'>Made with ❤️ by</p>
                <p style='font-size: 1rem; font-weight: 600; margin: 5px 0;'>Hafiz Mustafa Murtaza</p>
                <p style='font-size: 0.7rem; color: #a0aec0; margin: 5px 0;'>© 2024 Advanced SMS</p>
            </div>
        """, unsafe_allow_html=True)
    
    if page == "🏠 Home":
        render_home_page()
    elif page == "➕ Add Student":
        render_add_student_page()
    elif page == "📚 Manage Students":
        render_manage_students_page()
    elif page == "📊 AI Analytics":
        render_analytics_page()

if __name__ == "__main__":
    main()