from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import csv
from io import StringIO

app = Flask(__name__, static_folder='.')
CORS(app, resources={r"/*": {"origins": "*"}})

DATA_FILE = "students.txt"
VALID_GRADES = ['A', 'B', 'C', 'D', 'F']

def load_students():
    students = []
    
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            pass
        return students
    
    try:
        with open(DATA_FILE, 'r') as f:
            lines = f.readlines()
        
        for line in lines:
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
        print(f"Error loading file: {e}")
    
    return students


def save_students(students):
    try:
        with open(DATA_FILE, 'w') as f:
            for student in students:
                line = f"{student['id']},{student['name']},{student['age']},{student['grade']},{student['marks']}\n"
                f.write(line)
        return True
    except Exception as e:
        print(f"Error saving to file: {e}")
        return False


def validate_id(student_id, existing_students, updating_id=None):
    try:
        student_id = int(student_id)
    except (ValueError, TypeError):
        return False, "ID must be a valid integer"
    
    if student_id <= 0:
        return False, "ID must be greater than 0"
    
    for student in existing_students:
        if student['id'] == student_id and student_id != updating_id:
            return False, f"ID {student_id} already exists"
    
    return True, ""


def validate_name(name):
    if not name or not isinstance(name, str) or not name.strip():
        return False, "Name cannot be empty"
    
    name = name.strip()
    
    if name.isdigit():
        return False, "Name cannot be only numbers"
    
    if any(char.isdigit() for char in name):
        return False, "Name cannot contain numbers"
    
    if len(name) < 2:
        return False, "Name must be at least 2 characters"
    
    return True, ""


def validate_age(age):
    try:
        age = int(age)
    except (ValueError, TypeError):
        return False, "Age must be a valid integer"
    
    if age <= 0:
        return False, "Age must be greater than 0"
    
    if age < 5 or age > 100:
        return False, "Age must be between 5 and 100"
    
    return True, ""


def validate_grade(grade):
    if not grade:
        return False, "Grade cannot be empty"
    
    if not isinstance(grade, str):
        return False, "Grade must be a string"
    
    grade = grade.strip().upper()
    
    if len(grade) != 1:
        return False, "Grade must be a single letter"
    
    if grade not in VALID_GRADES:
        return False, f"Grade must be one of: {', '.join(VALID_GRADES)}"
    
    return True, ""


def validate_marks(marks):
    try:
        marks = int(marks)
    except (ValueError, TypeError):
        return False, "Marks must be a valid integer"
    
    if marks < 0 or marks > 100:
        return False, "Marks must be between 0 and 100"
    
    return True, ""


def validate_student_data(student_data, existing_students, updating_id=None):
    errors = []
    
    required_fields = ['id', 'name', 'age', 'grade', 'marks']
    for field in required_fields:
        if field not in student_data:
            errors.append(f"Missing required field: {field}")
    
    if errors:
        return False, errors
    
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


def calculate_average_marks(students):
    if not students:
        return 0
    total_marks = sum(student['marks'] for student in students)
    return round(total_marks / len(students), 2)


def find_top_performer(students):
    if not students:
        return None
    return max(students, key=lambda s: s['marks'])


def count_below_average(students, average):
    return sum(1 for student in students if student['marks'] < average)


def find_highest_lowest_marks(students):
    if not students:
        return 0, 0
    marks_list = [student['marks'] for student in students]
    return max(marks_list), min(marks_list)


def grade_distribution(students):
    distribution = {grade: 0 for grade in VALID_GRADES}
    for student in students:
        if student['grade'] in distribution:
            distribution[student['grade']] += 1
    return distribution


def pass_fail_analysis(students, passing_marks=40):
    if not students:
        return 0, 0, 0
    pass_count = sum(1 for student in students if student['marks'] >= passing_marks)
    fail_count = len(students) - pass_count
    pass_percentage = round((pass_count / len(students)) * 100, 2)
    return pass_count, fail_count, pass_percentage


def excellence_analysis(students):
    return [s for s in students if s['marks'] >= 90]


def age_group_analysis(students):
    age_groups = {
        '5-12': [],
        '13-15': [],
        '16-18': [],
        '19+': []
    }
    
    for student in students:
        age = student['age']
        if age <= 12:
            age_groups['5-12'].append(student['marks'])
        elif age <= 15:
            age_groups['13-15'].append(student['marks'])
        elif age <= 18:
            age_groups['16-18'].append(student['marks'])
        else:
            age_groups['19+'].append(student['marks'])
    
    age_group_avg = {}
    for group, marks in age_groups.items():
        if marks:
            age_group_avg[group] = round(sum(marks) / len(marks), 2)
        else:
            age_group_avg[group] = 0
    
    return age_group_avg


def analyze_data(students):
    if not students:
        return {
            'total_students': 0,
            'average_marks': 0,
            'top_performer': None,
            'below_average_count': 0,
            'highest_marks': 0,
            'lowest_marks': 0,
            'pass_count': 0,
            'fail_count': 0,
            'pass_percentage': 0,
            'grade_distribution': {},
            'excellence_students': [],
            'age_group_performance': {}
        }
    
    average = calculate_average_marks(students)
    top_student = find_top_performer(students)
    below_avg = count_below_average(students, average)
    highest, lowest = find_highest_lowest_marks(students)
    pass_count, fail_count, pass_percentage = pass_fail_analysis(students)
    grade_dist = grade_distribution(students)
    excellent = excellence_analysis(students)
    age_analysis = age_group_analysis(students)
    
    return {
        'total_students': len(students),
        'average_marks': average,
        'top_performer': top_student,
        'below_average_count': below_avg,
        'highest_marks': highest,
        'lowest_marks': lowest,
        'pass_count': pass_count,
        'fail_count': fail_count,
        'pass_percentage': pass_percentage,
        'grade_distribution': grade_dist,
        'excellence_students': excellent,
        'age_group_performance': age_analysis
    }


def parse_csv_data(csv_content):
    students = []
    errors = []
    
    try:
        csv_file = StringIO(csv_content)
        csv_reader = csv.DictReader(csv_file)
        
        required_fields = ['id', 'name', 'age', 'grade', 'marks']
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                if not all(field in row for field in required_fields):
                    errors.append(f"Row {row_num}: Missing required fields. Required: {', '.join(required_fields)}")
                    continue
                
                student = {
                    'id': int(row['id']),
                    'name': row['name'].strip(),
                    'age': int(row['age']),
                    'grade': row['grade'].strip().upper(),
                    'marks': int(row['marks'])
                }
                
                students.append(student)
                
            except ValueError as e:
                errors.append(f"Row {row_num}: Invalid data format - {str(e)}")
            except Exception as e:
                errors.append(f"Row {row_num}: Error - {str(e)}")
        
    except Exception as e:
        errors.append(f"CSV parsing error: {str(e)}")
    
    return students, errors


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'message': 'Server is running',
        'status': 'OK'
    })


@app.route('/api/students', methods=['GET'])
def get_students():
    try:
        students = load_students()
        return jsonify({'success': True, 'students': students})
    except Exception as e:
        return jsonify({'success': False, 'errors': [str(e)]}), 500


@app.route('/api/students', methods=['POST'])
def add_student():
    try:
        data = request.json
        
        if not data:
            return jsonify({'success': False, 'errors': ['No data provided']}), 400
        
        students = load_students()
        
        # Prepare student data WITHOUT type conversion first
        student_data = {
            'id': data.get('id'),
            'name': data.get('name', '').strip() if isinstance(data.get('name'), str) else data.get('name'),
            'age': data.get('age'),
            'grade': data.get('grade', '').strip().upper() if isinstance(data.get('grade'), str) else data.get('grade'),
            'marks': data.get('marks')
        }
        
        # Validate BEFORE type conversion
        is_valid, errors = validate_student_data(student_data, students)
        if not is_valid:
            return jsonify({'success': False, 'errors': errors}), 400
        
        # Now safe to convert types
        student_data = {
            'id': int(student_data['id']),
            'name': student_data['name'],
            'age': int(student_data['age']),
            'grade': student_data['grade'],
            'marks': int(student_data['marks'])
        }
        
        students.append(student_data)
        
        if save_students(students):
            return jsonify({
                'success': True,
                'message': f'Student {student_data["name"]} added successfully!',
                'student': student_data
            })
        
        return jsonify({'success': False, 'errors': ['Failed to save student']}), 500
    
    except Exception as e:
        return jsonify({'success': False, 'errors': [f'Server error: {str(e)}']}), 500


@app.route('/api/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    try:
        data = request.json
        
        if not data:
            return jsonify({'success': False, 'errors': ['No data provided']}), 400
        
        students = load_students()
        
        student_index = None
        for i, student in enumerate(students):
            if student['id'] == student_id:
                student_index = i
                break
        
        if student_index is None:
            return jsonify({'success': False, 'errors': [f'Student with ID {student_id} not found']}), 404
        
        # Prepare new data WITHOUT type conversion first
        new_data = {
            'id': data.get('id'),
            'name': data.get('name', '').strip() if isinstance(data.get('name'), str) else data.get('name'),
            'age': data.get('age'),
            'grade': data.get('grade', '').strip().upper() if isinstance(data.get('grade'), str) else data.get('grade'),
            'marks': data.get('marks')
        }
        
        # Validate BEFORE type conversion
        is_valid, errors = validate_student_data(new_data, students, updating_id=student_id)
        if not is_valid:
            return jsonify({'success': False, 'errors': errors}), 400
        
        # Now safe to convert types
        new_data = {
            'id': int(new_data['id']),
            'name': new_data['name'],
            'age': int(new_data['age']),
            'grade': new_data['grade'],
            'marks': int(new_data['marks'])
        }
        
        students[student_index] = new_data
        
        if save_students(students):
            return jsonify({
                'success': True,
                'message': f'Student {new_data["name"]} updated successfully!',
                'student': new_data
            })
        
        return jsonify({'success': False, 'errors': ['Failed to update student']}), 500
    
    except Exception as e:
        return jsonify({'success': False, 'errors': [f'Server error: {str(e)}']}), 500


@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    try:
        students = load_students()
        
        original_count = len(students)
        students = [s for s in students if s['id'] != student_id]
        
        if len(students) == original_count:
            return jsonify({'success': False, 'errors': [f'Student with ID {student_id} not found']}), 404
        
        if save_students(students):
            return jsonify({
                'success': True,
                'message': 'Student deleted successfully!'
            })
        
        return jsonify({'success': False, 'errors': ['Failed to delete student']}), 500
    
    except Exception as e:
        return jsonify({'success': False, 'errors': [f'Server error: {str(e)}']}), 500


@app.route('/api/students/search', methods=['POST'])
def search_students():
    try:
        data = request.json
        query = data.get('query', '').lower().strip() if data else ''
        
        students = load_students()
        
        if not query:
            return jsonify({'success': True, 'students': students})
        
        results = []
        for student in students:
            if str(student['id']) == query or query in student['name'].lower():
                results.append(student)
        
        return jsonify({'success': True, 'students': results})
    
    except Exception as e:
        return jsonify({'success': False, 'errors': [f'Server error: {str(e)}']}), 500


@app.route('/api/check-id/<int:student_id>', methods=['GET'])
def check_id(student_id):
    try:
        students = load_students()
        exists = any(s['id'] == student_id for s in students)
        
        return jsonify({
            'success': True,
            'exists': exists,
            'available': not exists
        })
    
    except Exception as e:
        return jsonify({'success': False, 'errors': [f'Server error: {str(e)}']}), 500


@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    try:
        students = load_students()
        analysis = analyze_data(students)
        
        return jsonify({
            'success': True,
            'analytics': analysis
        })
    
    except Exception as e:
        return jsonify({'success': False, 'errors': [f'Server error: {str(e)}']}), 500


@app.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    try:
        data = request.json
        csv_content = data.get('csv_content', '') if data else ''
        
        if not csv_content:
            return jsonify({'success': False, 'errors': ['No CSV content provided']}), 400
        
        new_students, parse_errors = parse_csv_data(csv_content)
        
        if not new_students and parse_errors:
            return jsonify({
                'success': False,
                'errors': parse_errors
            }), 400
        
        existing_students = load_students()
        
        validation_errors = []
        valid_students = []
        
        for idx, student in enumerate(new_students, start=1):
            is_valid, errors = validate_student_data(student, existing_students + valid_students)
            if is_valid:
                valid_students.append(student)
            else:
                validation_errors.append(f"Student {idx} ({student.get('name', 'Unknown')}): {', '.join(errors)}")
        
        if not valid_students:
            all_errors = parse_errors + validation_errors
            return jsonify({
                'success': False,
                'errors': all_errors
            }), 400
        
        existing_students.extend(valid_students)
        
        if save_students(existing_students):
            response_data = {
                'success': True,
                'message': f'Successfully imported {len(valid_students)} student(s)',
                'imported_count': len(valid_students),
                'total_count': len(new_students)
            }
            
            if parse_errors or validation_errors:
                response_data['warnings'] = parse_errors + validation_errors
            
            return jsonify(response_data)
        
        return jsonify({'success': False, 'errors': ['Failed to save students']}), 500
    
    except Exception as e:
        return jsonify({'success': False, 'errors': [f'Server error: {str(e)}']}), 500


@app.route('/api/export-csv', methods=['GET'])
def export_csv():
    try:
        students = load_students()
        
        if not students:
            return jsonify({'success': False, 'errors': ['No students to export']}), 404
        
        output = StringIO()
        fieldnames = ['id', 'name', 'age', 'grade', 'marks']
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        
        writer.writeheader()
        for student in students:
            writer.writerow(student)
        
        csv_content = output.getvalue()
        
        return jsonify({
            'success': True,
            'csv_content': csv_content,
            'filename': 'students_export.csv'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'errors': [f'Server error: {str(e)}']}), 500


if __name__ == '__main__':
    print("\n" + "="*70)
    print("🚀 SMART STUDENT MANAGEMENT SYSTEM - SERVER STARTING...")
    print("="*70)
    print("📡 Server running at: http://localhost:5000")
    print("📊 Access the web interface in your browser")
    print("✨ Created By: Hafiz Mustafa Murtaza")
    print("="*70 + "\n")
    
    app.run(debug=True, host='127.0.0.1', port=5000)