from functools import wraps
from flask import request, jsonify
from flask_login import current_user

def require_admin_role(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Unauthorized'}), 401
        
        if not current_user.is_admin:
            return jsonify({'error': 'Forbidden'}), 403
        
        return f(*args, **kwargs)
    return decorated_function
    