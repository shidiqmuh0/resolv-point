import json
import logging
import requests
from web3 import Web3

# Konfigurasi logging
logging.basicConfig(level=logging.DEBUG)

# Inisialisasi Web3 dengan Ethereum RPC publik
w3 = Web3(Web3.HTTPProvider('https://ethereum.publicnode.com'))

def resolve_ens(name):
    """Resolve ENS name to EVM address."""
    try:
        if name.endswith('.eth'):
            address = w3.ens.address(name)
            if address is None:
                raise ValueError(f'ENS name {name} not found')
            return address
        return name  # Kembalikan apa adanya jika bukan ENS name
    except Exception as e:
        logging.error(f'Error resolving ENS name {name}: {str(e)}')
        return None

def handler(event, context):
    """
    Vercel serverless function handler.
    Pastikan parameter 'address' dikirim melalui query string.
    """
    # Ambil parameter address dari query string
    address = event.get("queryStringParameters", {}).get("address", "")
    if not address:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Address is required"})
        }
    
    # Resolusi ENS (jika diperlukan)
    resolved_address = resolve_ens(address)
    if not resolved_address:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Invalid ENS name"})
        }

    try:
        # Panggil API Resolv.im dengan address yang telah di-resolve
        response = requests.get(
            "https://api.resolv.im/points",
            params={"address": resolved_address, "mock": "false"},
            headers={"Accept": "application/json"}
        )
        response.raise_for_status()
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(response.json())
        }
    except requests.RequestException as e:
        logging.error(f'Error fetching points: {str(e)}')
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "error": "Failed to fetch data from Resolv.im",
                "details": str(e)
            })
        }
