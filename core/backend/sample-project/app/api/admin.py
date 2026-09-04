from flask import Blueprint, request, jsonify
from flask_login import current_user

from app.services.export_service import ExportService
from app.middleware.auth import require_admin_role

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/export', methods=['POST'])
@require_admin_role
def export_data():
    service = ExportService(timeout_seconds=30)
    
    try:
        data = request.get_json()['data']
        columns = request.get_json()['columns']
        
        csv_content = service.export_data(data, columns)
        
        return jsonify({'status': 'accepted', 'job_id': 'export-001'}), 202
    except TimeoutError:
        return jsonify({'status': 'error', 'message': 'Export timed out'}), 408
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    