from flask import Blueprint, request, jsonify, session
from database.db_connection import get_connection
import os

helpdesk_bp = Blueprint('helpdesk', __name__, url_prefix='/api/helpdesk')


def ensure_table(cur):
    cur.execute('''CREATE TABLE IF NOT EXISTS support_tickets (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        category VARCHAR(100) NOT NULL,
        subject VARCHAR(180) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ticket_created(created_at),
        INDEX idx_ticket_user(user_id),
        CONSTRAINT fk_ticket_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB''')


@helpdesk_bp.post('/tickets')
def create_ticket():
    uid = session.get('user_id')
    if not uid:
        return jsonify(error='Please log in before sending a Help Desk request.'), 401
    data = request.get_json(silent=True) or {}
    category = (data.get('category') or 'Other').strip()[:100]
    subject = (data.get('subject') or '').strip()[:180]
    message = (data.get('message') or '').strip()
    if len(subject) < 3 or len(message) < 10:
        return jsonify(error='Enter a subject (at least 3 characters) and message (at least 10 characters).'), 400
    if len(message) > 5000:
        return jsonify(error='Message must be 5,000 characters or fewer.'), 400
    c = get_connection()
    cur = c.cursor()
    try:
        ensure_table(cur)
        cur.execute('INSERT INTO support_tickets(user_id,category,subject,message) VALUES(%s,%s,%s,%s)', (uid, category, subject, message))
        c.commit()
        return jsonify(success=True, ticket_id=cur.lastrowid), 201
    finally:
        cur.close()
        c.close()


@helpdesk_bp.get('/tickets')
def list_tickets():
    uid = session.get('user_id')
    if not uid:
        return jsonify(error='Please log in.'), 401
    admin_email = (os.getenv('HELPDESK_ADMIN_EMAIL') or '').strip().lower()
    if not admin_email:
        return jsonify(error='Admin ticket viewing is not configured. Set HELPDESK_ADMIN_EMAIL in backend/.env.'), 403
    c = get_connection()
    cur = c.cursor(dictionary=True)
    try:
        ensure_table(cur)
        cur.execute('SELECT email FROM users WHERE id=%s', (uid,))
        user = cur.fetchone()
        if not user or (user.get('email') or '').lower() != admin_email:
            return jsonify(error='Only the configured project administrator can view submitted tickets.'), 403
        cur.execute('''SELECT t.id,t.category,t.subject,t.message,t.status,t.created_at,u.name AS sender_name,u.email AS sender_email
                       FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 200''')
        return jsonify(success=True, data=cur.fetchall())
    finally:
        cur.close()
        c.close()
