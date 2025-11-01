"""
Advanced SMART STUDENT MANAGEMENT SYSTEM
Made By: Hafiz Mustafa Murtaza

A production-ready student management application built with Streamlit.
Uses only functional programming (no OOP) and file-based persistence.
"""

import streamlit as st
import pandas as pd
import os
from typing import List, Dict, Optional, Tuple
import re

# ============================================================================
# CONFIGURATION & CONSTANTS
# ============================================================================

DATA_FILE = "students.txt"
VALID_GRADES = ["A", "B", "C", "D", "F"]

# ============================================================================
# I. BACKEND LOGIC - FILE HANDLING FUNCTIONS
# ============================================================================

def load_students() -> List[Dict]:
    """
    Load all student records from the data file.
    
    Returns:
        List of student dictionaries. Empty list if file doesn't exist or is empty.
    
    Handles:
        - FileNotFoundError: Creates empty list
        - Corrupted data: Skips invalid lines and logs warnings
    """
    students = []
    
    # Create file if it doesn't exist
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            pass
        return students
    
    try:
        with open(DATA_FILE, 'r') as f:
            lines = f.readlines()
            
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line:  # Skip empty lines
                continue
                
            try:
                parts = line.split(',')
                if len(parts) != 5:
                    st.warning(f"Skipping corrupted line {line_num}: Invalid format")
                    continue
                
                student = {
                    'id': int(parts[0]),
                    'name': parts[1],
                    'age': int(parts[2]),
                    'grade': parts[3],
                    'marks': int(parts[4])
                }
                students.append(student)
                
            except (ValueError, IndexError) as e:
                st.warning(f"Skipping corrupted line {line_num}: {str(e)}")
                continue
                
    except Exception as e:
        st.error(f"Error loading students: {str(e)}")
        
    return students


def save_students(students: List[Dict]) -> bool:
    """
    Save all student records to the data file (overwrites existing content).
    
    Args:
        students: List of student dictionaries
        
    Returns:
        True if successful, False otherwise
    """
    try:
        with open(DATA_FILE, 'w') as f:
            for student in students:
                line = f"{student['id']},{student['name']},{student['age']},{student['grade']},{student['marks']}\n"
                f.write(line)
        return True
    except Exception as e:
        st.error(f"Error saving students: {str(e)}")
        return False


# ============================================================================
# II. VALIDATION HELPER FUNCTIONS
# ============================================================================

def validate_id(student_id: int, existing_students: List[Dict], updating_id: Optional[int] = None) -> Tuple[bool, str]:
    """
    Validate student ID.
    
    Args:
        student_id: The ID to validate
        existing_students: List of existing student records
        updating_id: If updating, the current ID (to allow keeping same ID)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(student_id, int) or student_id <= 0:
        return False, "ID must be a positive integer"
    
    # Check uniqueness (skip if updating the same student)
    for student in existing_students:
        if student['id'] == student_id and student_id != updating_id:
            return False, f"ID {student_id} already exists"
    
    return True, ""


def validate_name(name: str) -> Tuple[bool, str]:
    """
    Validate student name.
    
    Args:
        name: The name to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not name or not name.strip():
        return False, "Name cannot be empty"
    
    if any(char.isdigit() for char in name):
        return False, "Name cannot contain numbers"
    
    if len(name.strip()) < 2:
        return False, "Name must be at least 2 characters"
    
    return True, ""


def validate_age(age: int) -> Tuple[bool, str]:
    """
    Validate student age.
    
    Args:
        age: The age to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(age, int):
        return False, "Age must be an integer"
    
    if age < 5 or age > 30:
        return False, "Age must be between 5 and 30"
    
    return True, ""


def validate_grade(grade: str) -> Tuple[bool, str]:
    """
    Validate student grade.
    
    Args:
        grade: The grade to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not grade:
        return False, "Grade cannot be empty"
    
    if grade not in VALID_GRADES:
        return False, f"Grade must be one of: {', '.join(VALID_GRADES)}"
    
    return True, ""


def validate_marks(marks: int) -> Tuple[bool, str]:
    """
    Validate student marks.
    
    Args:
        marks: The marks to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(marks, int):
        return False, "Marks must be an integer"
    
    if marks < 0 or marks > 100:
        return False, "Marks must be between 0 and 100"
    
    return True, ""


def validate_student_data(student_data: Dict, existing_students: List[Dict], updating_id: Optional[int] = None) -> Tuple[bool, List[str]]:
    """
    Validate all student data fields.
    
    Args:
        student_data: Dictionary containing student information
        existing_students: List of existing students
        updating_id: If updating, the current student ID
        
    Returns:
        Tuple of (is_valid, list_of_error_messages)
    """
    errors = []
    
    # Validate each field
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


# ============================================================================
# III. CRUD OPERATION FUNCTIONS
# ============================================================================

def add_student(student_data: Dict) -> bool:
    """
    Add a new student record to the system.
    
    Args:
        student_data: Dictionary containing student information
        
    Returns:
        True if successful, False otherwise
    """
    students = load_students()
    
    # Validate data
    is_valid, errors = validate_student_data(student_data, students)
    if not is_valid:
        for error in errors:
            st.error(f"❌ {error}")
        return False
    
    # Add student
    students.append(student_data)
    
    # Save to file
    if save_students(students):
        return True
    return False


def update_student(student_id: int, new_data: Dict) -> bool:
    """
    Update an existing student's record.
    
    Args:
        student_id: ID of the student to update
        new_data: Dictionary containing updated student information
        
    Returns:
        True if successful, False otherwise
    """
    students = load_students()
    
    # Find student index
    student_index = None
    for i, student in enumerate(students):
        if student['id'] == student_id:
            student_index = i
            break
    
    if student_index is None:
        st.error(f"Student with ID {student_id} not found")
        return False
    
    # Validate new data (allow keeping same ID)
    is_valid, errors = validate_student_data(new_data, students, updating_id=student_id)
    if not is_valid:
        for error in errors:
            st.error(f"❌ {error}")
        return False
    
    # Update student
    students[student_index] = new_data
    
    # Save to file
    if save_students(students):
        return True
    return False


def delete_student(student_id: int) -> bool:
    """
    Delete a student record from the system.
    
    Args:
        student_id: ID of the student to delete
        
    Returns:
        True if successful, False otherwise
    """
    students = load_students()
    
    # Filter out the student to delete
    original_count = len(students)
    students = [s for s in students if s['id'] != student_id]
    
    if len(students) == original_count:
        st.error(f"Student with ID {student_id} not found")
        return False
    
    # Save to file
    if save_students(students):
        return True
    return False


def get_student_by_id(student_id: int) -> Optional[Dict]:
    """
    Retrieve a student record by ID.
    
    Args:
        student_id: ID of the student to find
        
    Returns:
        Student dictionary if found, None otherwise
    """
    students = load_students()
    
    for student in students:
        if student['id'] == student_id:
            return student
    
    return None


def is_id_unique(student_id: int) -> bool:
    """
    Check if a student ID is unique.
    
    Args:
        student_id: The ID to check
        
    Returns:
        True if unique, False otherwise
    """
    students = load_students()
    
    for student in students:
        if student['id'] == student_id:
            return False
    
    return True


def search_students(query: str) -> List[Dict]:
    """
    Search for students by ID or name (case-insensitive).
    
    Args:
        query: Search query string
        
    Returns:
        List of matching student dictionaries
    """
    if not query:
        return load_students()
    
    students = load_students()
    query_lower = query.lower().strip()
    
    results = []
    for student in students:
        # Search by ID (exact match)
        if str(student['id']) == query_lower:
            results.append(student)
        # Search by name (partial match)
        elif query_lower in student['name'].lower():
            results.append(student)
    
    return results


# ============================================================================
# IV. DATA ANALYSIS FUNCTIONS
# ============================================================================

def analyze_data(students: List[Dict]) -> Dict:
    """
    Perform comprehensive data analysis on student records.
    
    Args:
        students: List of student dictionaries
        
    Returns:
        Dictionary containing analysis results
    """
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
            'top_5_students': []
        }
    
    # Calculate average marks
    total_marks = sum(s['marks'] for s in students)
    average_marks = total_marks / len(students)
    
    # Find top and lowest performers
    top_student = max(students, key=lambda s: s['marks'])
    lowest_student = min(students, key=lambda s: s['marks'])
    
    # Count students below average
    below_average_count = sum(1 for s in students if s['marks'] < average_marks)
    
    # Grade distribution
    grade_distribution = {}
    for grade in VALID_GRADES:
        grade_distribution[grade] = sum(1 for s in students if s['grade'] == grade)
    
    # Age distribution (group by age ranges)
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
    
    # Average marks per grade
    average_marks_per_grade = {}
    for grade in VALID_GRADES:
        grade_students = [s for s in students if s['grade'] == grade]
        if grade_students:
            avg = sum(s['marks'] for s in grade_students) / len(grade_students)
            average_marks_per_grade[grade] = round(avg, 2)
        else:
            average_marks_per_grade[grade] = 0
    
    # Pass rate (assuming 40 is passing marks)
    pass_count = sum(1 for s in students if s['marks'] >= 40)
    pass_rate = (pass_count / len(students)) * 100
    
    # Top 5 students
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
        'top_5_students': top_5_students
    }


# ============================================================================
# V. UI HELPER FUNCTIONS
# ============================================================================

def initialize_session_state():
    """Initialize Streamlit session state variables."""
    if 'first_load' not in st.session_state:
        st.session_state.first_load = True
    if 'edit_student_id' not in st.session_state:
        st.session_state.edit_student_id = None


def show_welcome_popup():
    """Display welcome popup on first load."""
    if st.session_state.first_load:
        st.balloons()
        st.toast("🎓 Advanced SMART STUDENT MANAGEMENT SYSTEM - Made By Hafiz Mustafa Murtaza", icon="✨")
        st.session_state.first_load = False


def students_to_dataframe(students: List[Dict]) -> pd.DataFrame:
    """
    Convert student list to pandas DataFrame for display.
    
    Args:
        students: List of student dictionaries
        
    Returns:
        Pandas DataFrame
    """
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


# ============================================================================
# VI. PAGE RENDERING FUNCTIONS
# ============================================================================

def render_home_page():
    """Render the Home page."""
    st.title("🎓 Advanced SMART STUDENT MANAGEMENT SYSTEM")
    
    # Show welcome popup
    show_welcome_popup()
    
    # Welcome message
    st.markdown("""
    ### Welcome to the Smart Student Management System
    
    This advanced system provides comprehensive tools for managing student records with powerful analytics.
    
    **Key Features:**
    - ✅ Add, update, and delete student records
    - 🔍 Advanced search and filtering
    - 📊 Real-time data analytics and visualizations
    - ✔️ Robust input validation
    - 💾 Persistent file-based storage
    """)
    
    # System statistics
    students = load_students()
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.info(f"**Total Students**\n\n# {len(students)}")
    
    with col2:
        if students:
            avg_marks = sum(s['marks'] for s in students) / len(students)
            st.info(f"**Average Marks**\n\n# {avg_marks:.1f}")
        else:
            st.info(f"**Average Marks**\n\n# 0")
    
    with col3:
        if students:
            top_student = max(students, key=lambda s: s['marks'])
            st.info(f"**Top Score**\n\n# {top_student['marks']}")
        else:
            st.info(f"**Top Score**\n\n# 0")
    
    # Quick start guide
    st.markdown("---")
    st.markdown("""
    ### 🚀 Quick Start Guide
    
    1. **Add New Student**: Navigate to the 'Add New Student' page to register students
    2. **Manage Students**: View, search, update, or delete student records
    3. **Data Analysis**: Explore comprehensive analytics and visualizations
    
    Use the sidebar navigation to get started!
    """)


def render_add_student_page():
    """Render the Add New Student page."""
    st.title("➕ Add New Student")
    st.markdown("Fill in the form below to add a new student record.")
    
    students = load_students()
    
    # Create form
    with st.form("add_student_form", clear_on_submit=True):
        st.subheader("Student Information")
        
        col1, col2 = st.columns(2)
        
        with col1:
            student_id = st.number_input(
                "Student ID *",
                min_value=1,
                max_value=999999,
                step=1,
                help="Unique identifier for the student"
            )
            
            name = st.text_input(
                "Full Name *",
                max_chars=100,
                help="Student's full name (no numbers allowed)"
            )
            
            age = st.number_input(
                "Age *",
                min_value=5,
                max_value=30,
                value=15,
                step=1,
                help="Student's age (5-30)"
            )
        
        with col2:
            grade = st.selectbox(
                "Grade *",
                options=VALID_GRADES,
                help="Student's grade (A-F)"
            )
            
            marks = st.slider(
                "Marks *",
                min_value=0,
                max_value=100,
                value=50,
                help="Student's marks (0-100)"
            )
        
        st.markdown("**Required fields are marked with** *")
        
        # Submit button
        submitted = st.form_submit_button("✅ Add Student", use_container_width=True, type="primary")
        
        if submitted:
            # Real-time validation feedback (shown outside form after submission)
            student_data = {
                'id': student_id,
                'name': name.strip(),
                'age': age,
                'grade': grade,
                'marks': marks
            }
            
            # Validate and add
            if add_student(student_data):
                st.success(f"✅ Student **{name}** (ID: {student_id}) added successfully!")
                st.balloons()
            else:
                st.error("❌ Failed to add student. Please check the errors above and try again.")
    
    # Real-time ID uniqueness check (outside form)
    st.markdown("---")
    st.subheader("🔍 Quick ID Check")
    check_id = st.number_input("Check if ID is available", min_value=1, step=1, key="check_id")
    
    if check_id:
        if is_id_unique(check_id):
            st.success(f"✅ ID {check_id} is available")
        else:
            st.warning(f"⚠️ ID {check_id} is already in use")


def render_manage_students_page():
    """Render the Manage Students page."""
    st.title("📚 Manage Students")
    st.markdown("View, search, update, and delete student records.")
    
    students = load_students()
    
    if not students:
        st.info("📭 No students found. Add your first student to get started!")
        return
    
    # Search/Filter section
    st.subheader("🔍 Search Students")
    search_query = st.text_input(
        "Search by Name or ID",
        placeholder="Enter student name or ID...",
        help="Search is case-insensitive"
    )
    
    # Filter students based on search
    filtered_students = search_students(search_query)
    
    # Display count
    if search_query:
        st.caption(f"Found {len(filtered_students)} student(s) matching '{search_query}'")
    else:
        st.caption(f"Showing all {len(filtered_students)} student(s)")
    
    if not filtered_students:
        st.warning("No students match your search criteria.")
        return
    
    # Display students in dataframe
    st.subheader("📊 Student Records")
    df = students_to_dataframe(filtered_students)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    # Edit/Delete section
    st.markdown("---")
    st.subheader("✏️ Update or Delete Student")
    
    # Create a select box for choosing student to edit/delete
    student_options = {f"{s['id']} - {s['name']}": s['id'] for s in filtered_students}
    selected_student_label = st.selectbox(
        "Select a student to manage",
        options=list(student_options.keys()),
        help="Choose a student to update or delete"
    )
    
    if selected_student_label:
        selected_id = student_options[selected_student_label]
        selected_student = get_student_by_id(selected_id)
        
        if selected_student:
            # Display current information in an expander
            with st.expander("📋 Current Student Information", expanded=True):
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("ID", selected_student['id'])
                    st.metric("Age", selected_student['age'])
                with col2:
                    st.metric("Name", selected_student['name'])
                    st.metric("Grade", selected_student['grade'])
                with col3:
                    st.metric("Marks", selected_student['marks'])
            
            # Tabs for Update and Delete
            tab1, tab2 = st.tabs(["✏️ Update", "🗑️ Delete"])
            
            with tab1:
                st.markdown("### Update Student Information")
                
                with st.form(f"update_form_{selected_id}"):
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        new_id = st.number_input(
                            "Student ID",
                            min_value=1,
                            value=selected_student['id'],
                            step=1
                        )
                        
                        new_name = st.text_input(
                            "Full Name",
                            value=selected_student['name'],
                            max_chars=100
                        )
                        
                        new_age = st.number_input(
                            "Age",
                            min_value=5,
                            max_value=30,
                            value=selected_student['age'],
                            step=1
                        )
                    
                    with col2:
                        new_grade = st.selectbox(
                            "Grade",
                            options=VALID_GRADES,
                            index=VALID_GRADES.index(selected_student['grade'])
                        )
                        
                        new_marks = st.slider(
                            "Marks",
                            min_value=0,
                            max_value=100,
                            value=selected_student['marks']
                        )
                    
                    update_submitted = st.form_submit_button(
                        "💾 Save Changes",
                        use_container_width=True,
                        type="primary"
                    )
                    
                    if update_submitted:
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
                        else:
                            st.error("❌ Failed to update student.")
            
            with tab2:
                st.markdown("### Delete Student Record")
                st.warning(f"⚠️ You are about to delete **{selected_student['name']}** (ID: {selected_student['id']})")
                st.markdown("**This action cannot be undone!**")
                
                col1, col2, col3 = st.columns([1, 1, 2])
                
                with col1:
                    if st.button("🗑️ Confirm Delete", type="primary", use_container_width=True):
                        if delete_student(selected_student['id']):
                            st.success(f"✅ Student **{selected_student['name']}** deleted successfully!")
                            st.rerun()
                        else:
                            st.error("❌ Failed to delete student.")
                
                with col2:
                    if st.button("❌ Cancel", use_container_width=True):
                        st.info("Delete operation cancelled.")


def render_analytics_page():
    """Render the Data Analysis page."""
    st.title("📊 Data Analysis & Insights")
    st.markdown("Comprehensive analytics and visualizations of student performance.")
    
    students = load_students()
    
    if not students:
        st.info("📭 No data available for analysis. Add students to see insights!")
        return
    
    # Perform analysis
    analysis = analyze_data(students)
    
    # Key Metrics Section
    st.subheader("📈 Key Performance Metrics")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Total Students",
            analysis['total_students'],
            help="Total number of registered students"
        )
    
    with col2:
        st.metric(
            "Average Marks",
            f"{analysis['average_marks']}%",
            help="Average marks across all students"
        )
    
    with col3:
        st.metric(
            "Pass Rate",
            f"{analysis['pass_rate']}%",
            help="Percentage of students with marks ≥ 40"
        )
    
    with col4:
        st.metric(
            "Below Average",
            analysis['below_average_count'],
            help="Students scoring below average"
        )
    
    st.markdown("---")
    
    # Top and Bottom Performers
    st.subheader("🏆 Performance Highlights")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.success(f"**🥇 Top Performer**")
        st.markdown(f"**{analysis['top_performer']}**")
        st.markdown(f"Marks: **{analysis['top_performer_marks']}**")
    
    with col2:
        st.info(f"**📉 Lowest Performer**")
        st.markdown(f"**{analysis['lowest_performer']}**")
        st.markdown(f"Marks: **{analysis['lowest_performer_marks']}**")
    
    st.markdown("---")
    
    # Visualizations Section
    st.subheader("📊 Visual Analytics")
    
    # Grade Distribution Chart
    st.markdown("#### Grade Distribution")
    grade_df = pd.DataFrame(
        list(analysis['grade_distribution'].items()),
        columns=['Grade', 'Count']
    )
    st.bar_chart(grade_df.set_index('Grade'))
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Top 5 Students Chart
        st.markdown("#### Top 5 Students by Marks")
        if analysis['top_5_students']:
            top5_df = pd.DataFrame([
                {'Student': s['name'], 'Marks': s['marks']}
                for s in analysis['top_5_students']
            ])
            st.bar_chart(top5_df.set_index('Student'))
        else:
            st.info("Not enough data")
    
    with col2:
        # Age Distribution Chart
        st.markdown("#### Age Distribution")
        age_df = pd.DataFrame(
            list(analysis['age_distribution'].items()),
            columns=['Age Group', 'Count']
        )
        # Filter out empty groups
        age_df = age_df[age_df['Count'] > 0]
        if not age_df.empty:
            st.bar_chart(age_df.set_index('Age Group'))
        else:
            st.info("Not enough data")
    
    st.markdown("---")
    
    # Custom Insights
    st.subheader("💡 Advanced Insights")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Average Marks per Grade")
        avg_grade_df = pd.DataFrame(
            list(analysis['average_marks_per_grade'].items()),
            columns=['Grade', 'Average Marks']
        )
        avg_grade_df = avg_grade_df[avg_grade_df['Average Marks'] > 0]
        
        if not avg_grade_df.empty:
            st.dataframe(avg_grade_df, use_container_width=True, hide_index=True)
        else:
            st.info("Not enough data")
    
    with col2:
        st.markdown("#### Most Common Age Group")
        if analysis['age_distribution']:
            most_common_age = max(
                analysis['age_distribution'].items(),
                key=lambda x: x[1]
            )
            st.info(f"**Age Group: {most_common_age[0]}**")
            st.info(f"**Students: {most_common_age[1]}**")
        else:
            st.info("Not enough data")
    
    # Detailed Statistics Table
    st.markdown("---")
    st.subheader("📋 Detailed Statistics")
    
    stats_data = {
        'Metric': [
            'Total Students',
            'Average Marks',
            'Highest Marks',
            'Lowest Marks',
            'Pass Rate',
            'Students Below Average'
        ],
        'Value': [
            analysis['total_students'],
            f"{analysis['average_marks']}%",
            analysis['highest_marks'],
            analysis['lowest_marks'],
            f"{analysis['pass_rate']}%",
            analysis['below_average_count']
        ]
    }
    
    stats_df = pd.DataFrame(stats_data)
    st.dataframe(stats_df, use_container_width=True, hide_index=True)


# ============================================================================
# VII. MAIN APPLICATION FUNCTION
# ============================================================================

def main():
    """Main application entry point."""
    
    # Page configuration
    st.set_page_config(
        page_title="Smart Student Management System",
        page_icon="🎓",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Initialize session state
    initialize_session_state()
    
    # Custom CSS for better styling
    st.markdown("""
        <style>
        .stMetric {
            background-color: #f0f2f6;
            padding: 15px;
            border-radius: 10px;
        }
        .stButton>button {
            border-radius: 5px;
        }
        .stTabs [data-baseweb="tab-list"] {
            gap: 8px;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Sidebar navigation
    with st.sidebar:
        st.image("https://img.icons8.com/clouds/200/student-center.png", width=150)
        st.title("Navigation")
        
        page = st.radio(
            "Go to",
            ["🏠 Home", "➕ Add New Student", "📚 Manage Students", "📊 Data Analysis"],
            label_visibility="collapsed"
        )
        
        st.markdown("---")
        
        # Sidebar stats
        students = load_students()
        st.metric("Total Students", len(students))
        
        if students:
            avg = sum(s['marks'] for s in students) / len(students)
            st.metric("Avg. Marks", f"{avg:.1f}")
        
        st.markdown("---")
        st.caption("Made By Hafiz Mustafa Murtaza")
        st.caption("© 2024 Advanced SMS")
    
    # Route to appropriate page
    if page == "🏠 Home":
        render_home_page()
    elif page == "➕ Add New Student":
        render_add_student_page()
    elif page == "📚 Manage Students":
        render_manage_students_page()
    elif page == "📊 Data Analysis":
        render_analytics_page()


# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()