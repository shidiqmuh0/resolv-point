from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import requests
from web3 import Web3

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
logging.basicConfig(level=logging.DEBUG)

# Initialize Web3 with public Ethereum RPC
w3 = Web3(Web3.HTTPProvider('https://ethereum.publicnode.com'))

def resolve_ens(name):
    """Resolve ENS name to EVM address."""
    try:
        if name.endswith('.eth'):
            address = w3.ens.address(name)
            if address is None:
                raise ValueError(f'ENS name {name} not found')
            return address
        return name  # Return as-is if it's not an ENS name
    except Exception as e:
        return None

def handler(event, context):
    """Vercel serverless function handler."""
    address = event.get("queryStringParameters", {}).get("address", "")
    if not address:
        return {
            "statusCode": 400,
            "body": jsonify({"error": "Address is required"})
        }
    
    resolved_address = resolve_ens(address)
    if not resolved_address:
        return {
            "statusCode": 400,
            "body": jsonify({"error": "Invalid ENS name"})
        }

    try:
        response = requests.get(
            f'https://api.resolv.im/points',
            params={'address': resolved_address, 'mock': 'false'},
            headers={'Accept': 'application/json'}
        )

        response.raise_for_status()
        return {
            "statusCode": 200,
            "body": response.json()
        }
    except requests.RequestException as e:
        return {
            "statusCode": 500,
            "body": jsonify({"error": "Failed to fetch data", "details": str(e)})
        }
