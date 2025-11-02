Smart Student Management System
About:
A modern web application for managing student records with analytics, built using Python Flask and JavaScript. Features a beautiful gradient interface with charts, CSV import/export, search functionality, and printable result cards.

Features:
Add, view, update, and delete student records with validation (ID, name, age, grade, marks). Real-time analytics dashboard shows total students, average marks, pass rates, and grade distributions using interactive charts. Import/export student data via CSV files. Search students by ID or name and print professional result cards.

Installation Requirements: Python 3.8+

Steps:
Download the project files
Open terminal in project folder
Run: pip install flask flask-cors
Run: python app.py
Open browser to http://localhost:5000

Files:
app.py - Flask backend server
index.html - Web interface
styles.css - Styling
script.js - Frontend logic
students.txt - Data storage (auto-created)
Grading System
A: 90-100 (Excellent)
B: 70-89 (Good)
C: 50-69 (Average)
D: 40-49 (Below Average)
F: 0-39 (Fail)
Pass Mark: 40/100

CSV Format:
csv
id,name,age,grade,marks
101,Ali Ahmed,17,A,92
102,Sana Khan,18,B,76

Troubleshootingz:
Server won't start: Port 5000 may be in use
Connection error: Ensure Flask is running
CSV import fails: Check file format and duplicate IDs

Quick Start:
Open http://localhost:5000 and start managing students!

Made by Hafiz Mustafa Murtaza | © 2025
