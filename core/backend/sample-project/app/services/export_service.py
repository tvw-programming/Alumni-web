import csv
import io
import time
from typing import Any, Dict, List, Optional

from app.services.base_service import BaseService
from app.models.user import User

class ExportService(BaseService):
    def __init__(self, timeout_seconds: int = 30):
        self.timeout_seconds = timeout_seconds
        self._start_time: Optional[float] = None

    def check_timeout(self) -> bool:
        if self._start_time is None:
            self._start_time = time.time()
        return (time.time() - self._start_time) < self.timeout_seconds

    def generate_csv(self, data: List[Dict[str, Any]], columns: List[str]) -> bytes:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        for row in data:
            writer.writerow(row)
        return output.getvalue().encode('utf-8')

    def export_data(self, data: List[Dict[str, Any]], columns: List[str]) -> bytes:
        if not self.check_timeout():
            raise TimeoutError("Export timed out")
        
        self._start_time = time.time()
        csv_content = self.generate_csv(data, columns)
        
        if not self.check_timeout():
            raise TimeoutError("Export timed out")
        
        return csv_content
    