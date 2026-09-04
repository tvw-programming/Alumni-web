import pytest
from flask import url_for
from app.models.user import User

class TestAdminExport:
    def test_export_admin_success(self, client, admin_user):
        with client:
            client.login_user(admin_user)
            response = client.post('/admin/export', json={'data': [{'id': 1, 'name': 'Test'}], 'columns': ['id', 'name']})
            assert response.status_code == 202
            assert response.json['status'] == 'accepted'
    
    def test_export_non_admin_forbidden(self, client, regular_user):
        with client:
            client.login_user(regular_user)
            response = client.post('/admin/export', json={'data': [], 'columns': []})
            assert response.status_code == 403
    
    def test_export_unauthorized(self, client):
        with client:
            response = client.post('/admin/export', json={'data': [], 'columns': []})
            assert response.status_code == 401
    
    def test_export_timeout(self, client, admin_user):
        with client:
            client.login_user(admin_user)
            # Simulate slow export by mocking service
            from app.services import export_service
            original_export = export_service.ExportService.export_data
            def slow_export(self, data, columns):
                import time
                time.sleep(35)
                return b'content'
            export_service.ExportService.export_data = slow_export
            
            response = client.post('/admin/export', json={'data': [{'id': 1}], 'columns': ['id']})
            export_service.ExportService.export_data = original_export
            
            assert response.status_code == 408
