from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS
import sqlite3
import random
import string
import hashlib
import smtplib
from email.mime.text import MIMEText
import os
from datetime import datetime, timedelta
import secrets

app = Flask(__name__)
CORS(app)
app.secret_key = secrets.token_hex(16)

# Database setup
def init_db():
    conn = sqlite3.connect('tn_evoting.db')
    cursor = conn.cursor()
    
    # Create voters table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS voters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        aadhar_number TEXT UNIQUE NOT NULL,
        phone_number TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        is_verified BOOLEAN DEFAULT 0,
        verification_code TEXT,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create candidates table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        party TEXT NOT NULL,
        photo TEXT NOT NULL,
        logo TEXT NOT NULL,
        color TEXT NOT NULL
    )
    ''')
    
    # Create votes table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voter_id INTEGER NOT NULL,
        candidate_id INTEGER NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verification_code TEXT UNIQUE NOT NULL,
        FOREIGN KEY (voter_id) REFERENCES voters (id),
        FOREIGN KEY (candidate_id) REFERENCES candidates (id)
    )
    ''')
    
    # Create admin table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )
    ''')
    
    # Create settings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        enable_voting BOOLEAN DEFAULT 1,
        show_live_results BOOLEAN DEFAULT 1,
        allow_registration BOOLEAN DEFAULT 1
    )
    ''')
    
    # Insert default settings
    cursor.execute('INSERT OR IGNORE INTO settings (id, enable_voting, show_live_results, allow_registration) VALUES (1, 1, 1, 1)')
    
    # Insert sample candidates
    candidates = [
        ('Vijay', 'Tamizhaga Vetri Kazhagam (TVK)', 'tvk-vijay', 'tvk-logo', '#FF5733'),
        ('M.K. Stalin', 'Dravida Munnetra Kazhagam (DMK)', 'dmk-stalin', 'dmk-logo', '#FF0000'),
        ('Kamal Haasan', 'Makkal Needhi Maiam (MNM)', 'mnm-kamal', 'mnm-logo', '#FFC300'),
        ('Seeman', 'Naam Tamilar Katchi (NTK)', 'ntk-seeman', 'ntk-logo', '#C70039'),
        ('Edappadi Palaniswami', 'All India Anna Dravida Munnetra Kazhagam (AIADMK)', 'aiadmk-eps', 'aiadmk-logo', '#900C3F'),
        ('Anbumani Ramadoss', 'Pattali Makkal Katchi (PMK)', 'pmk-anbumani', 'pmk-logo', '#581845')
    ]
    
    cursor.executemany('INSERT OR IGNORE INTO candidates (name, party, photo, logo, color) VALUES (?, ?, ?, ?, ?)', 
                    [(c[0], c[1], c[2], c[3], c[4]) for c in candidates])
    
    # Create default admin user (username: admin, password: admin123)
    admin_password = hashlib.sha256("admin123".encode()).hexdigest()
    cursor.execute('INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?, ?)', 
                 ('admin', admin_password))
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

# Helper functions
def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def generate_verification_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def send_email(to_email, subject, body):
    # This is a placeholder - in production, use a proper email service
    # For development, you might want to use Flask-Mail or a 3rd party service like SendGrid
    
    try:
        # For demonstration purposes only
        print(f"Email sent to {to_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body}")
        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register_voter():
    try:
        # Check if registration is allowed
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        cursor.execute('SELECT allow_registration FROM settings WHERE id = 1')
        allow_registration = cursor.fetchone()[0]
        
        if not allow_registration:
            return jsonify({'success': False, 'message': 'Registration is currently disabled'}), 403
        
        data = request.get_json()
        full_name = data.get('fullName')
        aadhar_number = data.get('aadharNumber')
        phone_number = data.get('phoneNumber')
        email = data.get('email')
        
        # Validate input
        if not all([full_name, aadhar_number, phone_number, email]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
            
        if len(aadhar_number) != 12 or not aadhar_number.isdigit():
            return jsonify({'success': False, 'message': 'Invalid Aadhar number'}), 400
            
        if len(phone_number) != 10 or not phone_number.isdigit():
            return jsonify({'success': False, 'message': 'Invalid phone number'}), 400
        
        # Generate OTP for email verification
        otp = generate_otp()
        
        # Store voter information with verification code
        cursor.execute('''
        INSERT INTO voters (full_name, aadhar_number, phone_number, email, verification_code)
        VALUES (?, ?, ?, ?, ?)
        ''', (full_name, aadhar_number, phone_number, email, otp))
        
        voter_id = cursor.lastrowid
        conn.commit()
        
        # Send OTP via email
        email_subject = "Tamil Nadu E-Voting Portal - Email Verification"
        email_body = f"Dear {full_name},\n\nYour verification code is: {otp}\n\nThis code is valid for 10 minutes."
        send_email(email, email_subject, email_body)
        
        return jsonify({'success': True, 'message': 'Registration successful! Please verify your email.', 'voterId': voter_id})
    
    except sqlite3.IntegrityError as e:
        # Handle duplicate entries
        error_msg = str(e)
        if "aadhar_number" in error_msg:
            return jsonify({'success': False, 'message': 'Aadhar number already registered'}), 400
        elif "phone_number" in error_msg:
            return jsonify({'success': False, 'message': 'Phone number already registered'}), 400
        elif "email" in error_msg:
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
        else:
            return jsonify({'success': False, 'message': 'Registration failed due to duplicate information'}), 400
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/verify-email', methods=['POST'])
def verify_email():
    try:
        data = request.get_json()
        email = data.get('email')
        otp = data.get('otp')
        
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        
        # Verify OTP
        cursor.execute('SELECT id FROM voters WHERE email = ? AND verification_code = ?', (email, otp))
        result = cursor.fetchone()
        
        if result:
            voter_id = result[0]
            # Mark email as verified
            cursor.execute('UPDATE voters SET is_verified = 1, verification_code = NULL WHERE id = ?', (voter_id,))
            conn.commit()
            return jsonify({'success': True, 'message': 'Email verified successfully!'})
        else:
            return jsonify({'success': False, 'message': 'Invalid verification code'}), 400
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Verification failed: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/verify-phone', methods=['POST'])
def verify_phone():
    try:
        data = request.get_json()
        phone_number = data.get('phoneNumber')
        
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        
        # Check if the phone number is registered and verified
        cursor.execute('''
        SELECT id, full_name, is_verified FROM voters 
        WHERE phone_number = ?
        ''', (phone_number,))
        
        result = cursor.fetchone()
        
        if not result:
            return jsonify({'success': False, 'message': 'Phone number not registered'}), 404
        
        voter_id, full_name, is_verified = result
        
        if not is_verified:
            return jsonify({'success': False, 'message': 'Please complete email verification first'}), 403
        
        # Check if the voter has already voted
        cursor.execute('SELECT id FROM votes WHERE voter_id = ?', (voter_id,))
        has_voted = cursor.fetchone() is not None
        
        if has_voted:
            return jsonify({'success': False, 'message': 'You have already cast your vote'}), 403
        
        # Generate OTP for phone verification
        otp = generate_otp()
        
        # Store OTP
        cursor.execute('UPDATE voters SET verification_code = ? WHERE id = ?', (otp, voter_id))
        conn.commit()
        
        # In a real application, send OTP via SMS
        # For now, we'll just return it (development only)
        return jsonify({
            'success': True, 
            'message': 'Verification code sent to your phone',
            'otp': otp,  # Remove this in production!
            'voterId': voter_id,
            'name': full_name
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Verification failed: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    try:
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, party, photo, logo, color FROM candidates')
        candidates = cursor.fetchall()
        
        candidate_list = []
        for c in candidates:
            candidate_list.append({
                'id': c[0],
                'name': c[1],
                'party': c[2],
                'photo': c[3],
                'logo': c[4],
                'color': c[5]
            })
        
        return jsonify({'success': True, 'candidates': candidate_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch candidates: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/vote', methods=['POST'])
def cast_vote():
    try:
        # Check if voting is enabled
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        cursor.execute('SELECT enable_voting FROM settings WHERE id = 1')
        enable_voting = cursor.fetchone()[0]
        
        if not enable_voting:
            return jsonify({'success': False, 'message': 'Voting is currently disabled'}), 403
        
        data = request.get_json()
        voter_id = data.get('voterId')
        candidate_id = data.get('candidateId')
        otp = data.get('otp')
        
        # Verify OTP
        cursor.execute('SELECT verification_code FROM voters WHERE id = ?', (voter_id,))
        result = cursor.fetchone()
        
        if not result or result[0] != otp:
            return jsonify({'success': False, 'message': 'Invalid verification code'}), 400
        
        # Check if voter has already voted
        cursor.execute('SELECT id FROM votes WHERE voter_id = ?', (voter_id,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'You have already cast your vote'}), 403
        
        # Generate unique verification code for vote verification
        verification_code = generate_verification_code()
        
        # Record the vote
        cursor.execute('''
        INSERT INTO votes (voter_id, candidate_id, verification_code)
        VALUES (?, ?, ?)
        ''', (voter_id, candidate_id, verification_code))
        
        # Clear the OTP
        cursor.execute('UPDATE voters SET verification_code = NULL WHERE id = ?', (voter_id,))
        
        conn.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Your vote has been recorded successfully!',
            'verificationCode': verification_code
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Voting failed: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/verify-vote', methods=['POST'])
def verify_vote_status():
    try:
        data = request.get_json()
        verification_code = data.get('verificationCode')
        
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        
        # Find the vote with this verification code
        cursor.execute('''
        SELECT v.timestamp, c.name, c.party 
        FROM votes v
        JOIN candidates c ON v.candidate_id = c.id
        WHERE v.verification_code = ?
        ''', (verification_code,))
        
        result = cursor.fetchone()
        
        if result:
            timestamp, candidate_name, party = result
            return jsonify({
                'success': True,
                'verified': True,
                'timestamp': timestamp,
                'candidateName': candidate_name,
                'party': party
            })
        else:
            return jsonify({
                'success': True,
                'verified': False,
                'message': 'No vote found with this verification code'
            })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Verification failed: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/results', methods=['GET'])
def get_results():
    try:
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        
        # Check if showing results is allowed
        cursor.execute('SELECT show_live_results FROM settings WHERE id = 1')
        show_results = cursor.fetchone()[0]
        
        if not show_results:
            return jsonify({'success': False, 'message': 'Results are not available at this time'}), 403
        
        # Get total registered voters
        cursor.execute('SELECT COUNT(*) FROM voters WHERE is_verified = 1')
        total_voters = cursor.fetchone()[0]
        
        # Get total votes cast
        cursor.execute('SELECT COUNT(*) FROM votes')
        total_votes = cursor.fetchone()[0]
        
        # Calculate voting percentage
        voting_percentage = 0
        if total_voters > 0:
            voting_percentage = round((total_votes / total_voters) * 100, 2)
        
        # Get results by candidate
        cursor.execute('''
        SELECT c.id, c.name, c.party, c.photo, c.logo, c.color, COUNT(v.id) as vote_count
        FROM candidates c
        LEFT JOIN votes v ON c.id = v.candidate_id
        GROUP BY c.id
        ORDER BY vote_count DESC
        ''')
        
        candidates = cursor.fetchall()
        
        results = []
        for c in candidates:
            candidate_id, name, party, photo, logo, color, votes = c
            percentage = 0
            if total_votes > 0:
                percentage = round((votes / total_votes) * 100, 2)
                
            results.append({
                'id': candidate_id,
                'name': name,
                'party': party,
                'photo': photo,
                'logo': logo,
                'color': color,
                'votes': votes,
                'percentage': percentage
            })
        
        return jsonify({
            'success': True,
            'totalVoters': total_voters,
            'totalVotes': total_votes,
            'votingPercentage': voting_percentage,
            'results': results
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch results: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        password_hash = hash_password(password)
        
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM admins WHERE username = ? AND password_hash = ?', 
                     (username, password_hash))
        
        admin = cursor.fetchone()
        
        if admin:
            # Create session
            session['admin_id'] = admin[0]
            session['admin_username'] = username
            
            return jsonify({'success': True, 'message': 'Login successful'})
        else:
            return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Login failed: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_id', None)
    session.pop('admin_username', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/admin/results', methods=['GET'])
def admin_results():
    if 'admin_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    return get_results()

@app.route('/api/admin/voters', methods=['GET'])
def admin_voters():
    if 'admin_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    try:
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        
        search = request.args.get('search', '')
        
        query = '''
        SELECT v.id, v.full_name, v.phone_number, v.email, v.is_verified, 
               CASE WHEN votes.id IS NOT NULL THEN 1 ELSE 0 END as has_voted
        FROM voters v
        LEFT JOIN votes ON v.id = votes.voter_id
        '''
        
        params = []
        if search:
            query += '''
            WHERE v.full_name LIKE ? OR v.phone_number LIKE ? OR v.email LIKE ?
            '''
            search_param = f'%{search}%'
            params = [search_param, search_param, search_param]
            
        cursor.execute(query, params)
        voters = cursor.fetchall()
        
        voter_list = []
        for v in voters:
            voter_id, name, phone, email, is_verified, has_voted = v
            voter_list.append({
                'id': voter_id,
                'name': name,
                'phone': phone,
                'email': email,
                'isVerified': bool(is_verified),
                'hasVoted': bool(has_voted)
            })
        
        return jsonify({'success': True, 'voters': voter_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch voters: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/admin/settings', methods=['GET'])
def get_settings():
    if 'admin_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    try:
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT enable_voting, show_live_results, allow_registration FROM settings WHERE id = 1')
        settings = cursor.fetchone()
        
        return jsonify({
            'success': True,
            'settings': {
                'enableVoting': bool(settings[0]),
                'showLiveResults': bool(settings[1]),
                'allowRegistration': bool(settings[2])
            }
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch settings: {str(e)}'}), 500
    
    finally:
        conn.close()

@app.route('/api/admin/settings', methods=['POST'])
def update_settings():
    if 'admin_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
    try:
        data = request.get_json()
        enable_voting = data.get('enableVoting')
        show_live_results = data.get('showLiveResults')
        allow_registration = data.get('allowRegistration')
        
        conn = sqlite3.connect('tn_evoting.db')
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE settings 
        SET enable_voting = ?, show_live_results = ?, allow_registration = ?
        WHERE id = 1
        ''', (enable_voting, show_live_results, allow_registration))
        
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Settings updated successfully'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to update settings: {str(e)}'}), 500
    
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)