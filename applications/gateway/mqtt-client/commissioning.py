#!/usr/bin/env python3
"""
Commissioning Script untuk mendaftarkan device ke backend
"""

import json
import sys
import requests
import os
from datetime import datetime

API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:9001')

def register_device(tenant_id, site_id, device_id, serial_number, model):
    """Registrasi device ke backend"""
    payload = {
        "tenantId": tenant_id,
        "siteId": site_id,
        "deviceId": device_id,
        "serialNumber": serial_number,
        "model": model,
        "status": "PENDING",
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/v1/devices/register",
            json=payload,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ Device registered: {device_id}")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"   {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python3 commissioning.py <tenant_id> <site_id> <device_id> <serial_number> <model>")
        sys.exit(1)
    
    tenant_id = sys.argv[1]
    site_id = sys.argv[2]
    device_id = sys.argv[3]
    serial_number = sys.argv[4]
    model = sys.argv[5]
    
    register_device(tenant_id, site_id, device_id, serial_number, model)
